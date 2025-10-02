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

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(CustomerSchema.name) private customerModel: Model<CustomerDocument>
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

  async findAll(filters?: CustomerFilters): Promise<Customer[]> {
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

    // Execute query with sorting (newest first) and use lean() for performance
    const customers = await this.customerModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return customers.map(customer => this.convertCustomerDocument(customer as any));
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

  async remove(id: string): Promise<void> {
    const result = await this.customerModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
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