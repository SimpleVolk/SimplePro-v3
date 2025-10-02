import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Opportunity, OpportunityDocument } from './schemas/opportunity.schema';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectModel(Opportunity.name)
    private opportunityModel: Model<OpportunityDocument>,
    private eventEmitter: EventEmitter2,
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
}
