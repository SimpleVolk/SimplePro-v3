import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilters
} from './interfaces/customer.interface';
import { Customer as CustomerSchema, CustomerDocument } from './schemas/customer.schema';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { TransactionService } from '../database/transaction.service';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { Opportunity, OpportunityDocument } from '../opportunities/schemas/opportunity.schema';
import { DocumentEntity as DocumentSchema, DocumentDocument } from '../documents/schemas/document.schema';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(CustomerSchema.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Opportunity.name) private opportunityModel: Model<OpportunityDocument>,
    @InjectModel(DocumentSchema.name) private documentModel: Model<DocumentDocument>,
    private transactionService: TransactionService,
    private cacheService: CacheService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, createdBy: string): Promise<Customer> {
    // Check for duplicate email using case-insensitive query
    const existingCustomer = await this.customerModel.findOne({
      email: new RegExp(`^${createCustomerDto.email}$`, 'i')
    });

    if (existingCustomer) {
      throw new ConflictException('Customer with this email already exists');
    }

    // Create customer document
    const customer = new this.customerModel({
      ...createCustomerDto,
      status: 'lead', // Default status for new customers
      communicationPreferences: createCustomerDto.communicationPreferences || {
        allowMarketing: true,
        allowSms: true,
        allowEmail: true,
      },
      estimates: [],
      jobs: [],
      createdBy,
    });

    await customer.save();
    return this.convertCustomerDocument(customer);
  }

  async findAll(
    filters?: CustomerFilters,
    skip: number = 0,
    limit: number = 20,
  ): Promise<PaginatedResponse<Customer>> {
    // Build MongoDB query object
    const query: any = {};

    if (filters) {
      // Simple equality filters
      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;
      if (filters.source) query.source = filters.source;
      if (filters.assignedSalesRep) query.assignedSalesRep = filters.assignedSalesRep;

      // Tags filter (customer must have at least one of the specified tags)
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Lead score range
      if (filters.leadScoreMin !== undefined || filters.leadScoreMax !== undefined) {
        query.leadScore = {};
        if (filters.leadScoreMin !== undefined) {
          query.leadScore.$gte = filters.leadScoreMin;
        }
        if (filters.leadScoreMax !== undefined) {
          query.leadScore.$lte = filters.leadScoreMax;
        }
      }

      // Date range filters
      if (filters.createdAfter || filters.createdBefore) {
        query.createdAt = {};
        if (filters.createdAfter) query.createdAt.$gte = filters.createdAfter;
        if (filters.createdBefore) query.createdAt.$lte = filters.createdBefore;
      }

      if (filters.lastContactAfter || filters.lastContactBefore) {
        query.lastContactDate = {};
        if (filters.lastContactAfter) query.lastContactDate.$gte = filters.lastContactAfter;
        if (filters.lastContactBefore) query.lastContactDate.$lte = filters.lastContactBefore;
      }

      // Text search using MongoDB text index
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
    }

    // Execute count and find queries in parallel for performance
    const [total, customers] = await Promise.all([
      this.customerModel.countDocuments(query).exec(),
      this.customerModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const data = customers.map(customer => this.convertCustomerDocument(customer as any));
    const page = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return this.convertCustomerDocument(customer);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const customer = await this.customerModel.findOne({
      email: new RegExp(`^${email}$`, 'i')
    }).exec();
    return customer ? this.convertCustomerDocument(customer) : null;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, _updatedBy: string): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.customerModel.findById(id).exec();
    if (!existingCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Check for email conflicts if email is being updated
    if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.email) {
      const duplicateCustomer = await this.customerModel.findOne({
        email: new RegExp(`^${updateCustomerDto.email}$`, 'i'),
        _id: { $ne: id }
      }).exec();

      if (duplicateCustomer) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    // Merge nested objects properly
    const updateData: any = { ...updateCustomerDto };

    // Merge address if provided
    if (updateCustomerDto.address) {
      updateData.address = {
        ...existingCustomer.address,
        ...updateCustomerDto.address,
      };
    }

    // Merge communication preferences if provided
    if (updateCustomerDto.communicationPreferences) {
      updateData.communicationPreferences = {
        ...existingCustomer.communicationPreferences,
        ...updateCustomerDto.communicationPreferences,
      };
    }

    // Merge referredBy if provided
    if (updateCustomerDto.referredBy) {
      updateData.referredBy = {
        ...existingCustomer.referredBy,
        ...updateCustomerDto.referredBy,
      };
    }

    // Use findByIdAndUpdate for atomic update
    const updatedCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.convertCustomerDocument(updatedCustomer);
  }

  /**
   * Delete customer with cascading deletes using transaction
   *
   * This method uses a transaction to ensure:
   * 1. All customer jobs are deleted
   * 2. All customer opportunities are deleted
   * 3. All customer documents are archived (not deleted for audit purposes)
   * 4. Customer record is deleted
   *
   * All operations succeed or fail atomically to maintain data consistency.
   */
  async remove(id: string): Promise<void> {
    return this.transactionService.withTransaction(async (session) => {
      // 1. Verify customer exists
      const customer = await this.customerModel.findById(id).session(session).exec();
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // 2. Delete all customer jobs (or set to deleted status)
      const jobDeleteResult = await this.jobModel.deleteMany(
        { customerId: id },
        { session }
      ).exec();

      // 3. Delete all customer opportunities
      const opportunityDeleteResult = await this.opportunityModel.deleteMany(
        { customerId: id },
        { session }
      ).exec();

      // 4. Archive customer documents (don't delete for audit trail)
      const documentArchiveResult = await this.documentModel.updateMany(
        { relatedCustomer: id },
        { $set: { archived: true, archivedAt: new Date() } },
        { session }
      ).exec();

      // 5. Delete customer
      await this.customerModel.findByIdAndDelete(id, { session }).exec();

      // Log the cleanup results for monitoring
      console.log(`Customer ${id} deleted with cascades:`, {
        jobsDeleted: jobDeleteResult.deletedCount,
        opportunitiesDeleted: opportunityDeleteResult.deletedCount,
        documentsArchived: documentArchiveResult.modifiedCount,
      });
    });
  }

  async addEstimate(customerId: string, estimateId: string): Promise<Customer> {
    // Use $addToSet to avoid duplicates
    const customer = await this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $addToSet: { estimates: estimateId },
        $set: { updatedAt: new Date() }
      },
      { new: true, runValidators: true }
    ).exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return this.convertCustomerDocument(customer);
  }

  async addJob(customerId: string, jobId: string): Promise<Customer> {
    // Use $addToSet to avoid duplicates
    const customer = await this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $addToSet: { jobs: jobId },
        $set: { updatedAt: new Date() }
      },
      { new: true, runValidators: true }
    ).exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return this.convertCustomerDocument(customer);
  }

  async updateLastContact(customerId: string): Promise<Customer> {
    const now = new Date();
    const customer = await this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $set: {
          lastContactDate: now,
          updatedAt: now
        }
      },
      { new: true, runValidators: true }
    ).exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return this.convertCustomerDocument(customer);
  }

  // Analytics methods
  async getCustomerStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    recentlyCreated: number; // Last 30 days
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use MongoDB aggregation for efficient stats calculation
    const [totalCount, recentCount, statusCounts, typeCounts, sourceCounts] = await Promise.all([
      this.customerModel.countDocuments().exec(),
      this.customerModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).exec(),
      this.customerModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).exec(),
      this.customerModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]).exec(),
      this.customerModel.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]).exec()
    ]);

    const stats = {
      total: totalCount,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      recentlyCreated: recentCount,
    };

    // Convert aggregation results to objects
    statusCounts.forEach(({ _id, count }) => {
      stats.byStatus[_id] = count;
    });

    typeCounts.forEach(({ _id, count }) => {
      stats.byType[_id] = count;
    });

    sourceCounts.forEach(({ _id, count }) => {
      stats.bySource[_id] = count;
    });

    return stats;
  }

  // Helper method to convert Mongoose document to Customer interface
  private convertCustomerDocument(doc: CustomerDocument | any): Customer {
    const customer = doc.toObject ? doc.toObject() : doc;

    return {
      id: customer._id?.toString() || customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      alternatePhone: customer.alternatePhone,
      address: customer.address,
      type: customer.type,
      status: customer.status,
      source: customer.source,
      companyName: customer.companyName,
      businessLicense: customer.businessLicense,
      preferredContactMethod: customer.preferredContactMethod,
      communicationPreferences: customer.communicationPreferences,
      notes: customer.notes,
      leadScore: customer.leadScore,
      tags: customer.tags,
      assignedSalesRep: customer.assignedSalesRep,
      referredBy: customer.referredBy,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      createdBy: customer.createdBy,
      lastContactDate: customer.lastContactDate,
      estimates: customer.estimates,
      jobs: customer.jobs,
    };
  }
}