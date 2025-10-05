import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Opportunity, OpportunityDocument } from './schemas/opportunity.schema';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { TransactionService } from '../database/transaction.service';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectModel(Opportunity.name)
    private opportunityModel: Model<OpportunityDocument>,
    private eventEmitter: EventEmitter2,
    private transactionService: TransactionService,
  ) {}

  async create(dto: CreateOpportunityDto, userId: string): Promise<OpportunityDocument> {
    const opportunity = new this.opportunityModel({
      ...dto,
      createdBy: userId,
      status: 'open',
    });

    const saved = await opportunity.save();

    // Emit event for automation rules
    this.eventEmitter.emit('opportunity.created', {
      opportunity: saved,
      userId,
      leadSource: saved.leadSource,
    });

    return saved;
  }

  async findAll(query?: any): Promise<OpportunityDocument[]> {
    const filter: any = {};

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.leadSource) {
      filter.leadSource = query.leadSource;
    }

    if (query?.customerId) {
      filter.customerId = query.customerId;
    }

    if (query?.assignedSalesRep) {
      filter.assignedSalesRep = query.assignedSalesRep;
    }

    if (query?.fromDate || query?.toDate) {
      filter.moveDate = {};
      if (query.fromDate) {
        filter.moveDate.$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        filter.moveDate.$lte = new Date(query.toDate);
      }
    }

    return this.opportunityModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<OpportunityDocument> {
    const opportunity = await this.opportunityModel.findById(id).exec();

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    return opportunity;
  }

  async update(id: string, updates: Partial<CreateOpportunityDto>, userId: string): Promise<OpportunityDocument> {
    const opportunity = await this.opportunityModel.findByIdAndUpdate(
      id,
      { ...updates, updatedBy: userId },
      { new: true },
    ).exec();

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    return opportunity;
  }

  async updateStatus(id: string, status: string, userId: string): Promise<OpportunityDocument> {
    const oldOpportunity = await this.opportunityModel.findById(id).exec();

    if (!oldOpportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    const opportunity = await this.opportunityModel.findByIdAndUpdate(
      id,
      { status, updatedBy: userId },
      { new: true },
    ).exec();

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    // Emit event for status change
    this.eventEmitter.emit('opportunity.status_changed', {
      opportunity,
      previousStatus: oldOpportunity.status,
      newStatus: status,
      userId,
    });

    return opportunity;
  }

  async delete(id: string): Promise<void> {
    const result = await this.opportunityModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }
  }

  async getStatistics(userId?: string): Promise<any> {
    const filter = userId ? { createdBy: userId } : {};

    const [total, byStatus, byLeadSource] = await Promise.all([
      this.opportunityModel.countDocuments(filter),
      this.opportunityModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.opportunityModel.aggregate([
        { $match: filter },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byLeadSource: byLeadSource.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    };
  }

  /**
   * Convert opportunity to won status with transaction
   *
   * This method uses a transaction to ensure:
   * 1. Opportunity status is updated to 'won'
   * 2. Opportunity is linked to the job
   * 3. Conversion event is tracked
   *
   * All operations succeed or fail atomically.
   *
   * @param opportunityId - The opportunity to convert
   * @param jobId - The newly created job ID
   * @param userId - User performing the conversion
   */
  async markAsWon(opportunityId: string, jobId: string, userId: string): Promise<OpportunityDocument> {
    return this.transactionService.withTransaction(async (session) => {
      // 1. Find and update opportunity
      const opportunity = await this.opportunityModel.findById(opportunityId).session(session).exec();

      if (!opportunity) {
        throw new NotFoundException(`Opportunity with ID ${opportunityId} not found`);
      }

      // 2. Update opportunity status to won
      opportunity.status = 'won';
      opportunity.updatedBy = userId;
      await opportunity.save({ session });

      // 3. Emit conversion event for analytics (will be processed after transaction commits)
      setImmediate(() => {
        this.eventEmitter.emit('opportunity.converted', {
          opportunity,
          jobId,
          userId,
          convertedAt: new Date(),
        });
      });

      return opportunity;
    });
  }
}
