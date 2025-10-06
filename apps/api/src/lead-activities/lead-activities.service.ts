import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  LeadActivity,
  LeadActivityDocument,
} from './schemas/lead-activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';

@Injectable()
export class LeadActivitiesService {
  constructor(
    @InjectModel(LeadActivity.name)
    private activityModel: Model<LeadActivityDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createActivity(
    dto: CreateActivityDto,
    userId: string,
  ): Promise<LeadActivityDocument> {
    const activityId = dto.activityId || uuidv4();

    const activity = new this.activityModel({
      ...dto,
      activityId,
      createdBy: userId,
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    const saved = await activity.save();

    // Emit event for activity creation
    this.eventEmitter.emit('activity.created', {
      activity: saved,
      userId,
    });

    return saved;
  }

  async findByOpportunity(
    opportunityId: string,
  ): Promise<LeadActivityDocument[]> {
    return this.activityModel
      .find({ opportunityId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCustomer(customerId: string): Promise<LeadActivityDocument[]> {
    return this.activityModel
      .find({ customerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findPendingFollowUps(userId?: string): Promise<LeadActivityDocument[]> {
    const filter: any = {
      completedDate: { $exists: false },
      dueDate: { $exists: true },
    };

    if (userId) {
      filter.assignedTo = userId;
    }

    return this.activityModel.find(filter).sort({ dueDate: 1 }).exec();
  }

  async findOverdueActivities(
    userId?: string,
  ): Promise<LeadActivityDocument[]> {
    const now = new Date();
    const filter: any = {
      completedDate: { $exists: false },
      dueDate: { $lt: now },
    };

    if (userId) {
      filter.assignedTo = userId;
    }

    return this.activityModel.find(filter).sort({ dueDate: 1 }).exec();
  }

  async findAll(query: ActivityQueryDto): Promise<LeadActivityDocument[]> {
    const filter: any = {};

    if (query.opportunityId) {
      filter.opportunityId = query.opportunityId;
    }

    if (query.customerId) {
      filter.customerId = query.customerId;
    }

    if (query.assignedTo) {
      filter.assignedTo = query.assignedTo;
    }

    if (query.activityType) {
      filter.activityType = query.activityType;
    }

    if (query.outcome) {
      filter.outcome = query.outcome;
    }

    if (query.status === 'pending') {
      filter.completedDate = { $exists: false };
    } else if (query.status === 'completed') {
      filter.completedDate = { $exists: true };
    } else if (query.status === 'overdue') {
      filter.completedDate = { $exists: false };
      filter.dueDate = { $lt: new Date() };
    }

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) {
        filter.createdAt.$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        filter.createdAt.$lte = new Date(query.toDate);
      }
    }

    return this.activityModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async completeActivity(
    activityId: string,
    dto: CompleteActivityDto,
    userId: string,
  ): Promise<LeadActivityDocument> {
    const activity = await this.activityModel.findOne({ activityId }).exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${activityId} not found`);
    }

    if (activity.completedDate) {
      throw new BadRequestException('Activity is already completed');
    }

    const completedDate = dto.completedDate
      ? new Date(dto.completedDate)
      : new Date();

    activity.outcome = dto.outcome;
    activity.completedDate = completedDate;
    activity.completedBy = userId;
    activity.updatedBy = userId;

    if (dto.metadata) {
      activity.metadata = {
        ...activity.metadata,
        ...dto.metadata,
      };
    }

    const updated = await activity.save();

    // Emit event for activity completion
    this.eventEmitter.emit('activity.completed', {
      activity: updated,
      userId,
      outcome: dto.outcome,
    });

    return updated;
  }

  async getActivityTimeline(
    opportunityId: string,
  ): Promise<LeadActivityDocument[]> {
    return this.activityModel
      .find({ opportunityId })
      .sort({ createdAt: 1 }) // Chronological order
      .exec();
  }

  async getActivityStats(userId?: string): Promise<any> {
    const filter = userId ? { assignedTo: userId } : {};

    const [
      total,
      completed,
      pending,
      overdue,
      byType,
      byOutcome,
      avgResponseTime,
    ] = await Promise.all([
      this.activityModel.countDocuments(filter),
      this.activityModel.countDocuments({
        ...filter,
        completedDate: { $exists: true },
      }),
      this.activityModel.countDocuments({
        ...filter,
        completedDate: { $exists: false },
        dueDate: { $exists: true },
      }),
      this.activityModel.countDocuments({
        ...filter,
        completedDate: { $exists: false },
        dueDate: { $lt: new Date() },
      }),
      this.activityModel.aggregate([
        { $match: filter },
        { $group: { _id: '$activityType', count: { $sum: 1 } } },
      ]),
      this.activityModel.aggregate([
        { $match: { ...filter, outcome: { $exists: true } } },
        { $group: { _id: '$outcome', count: { $sum: 1 } } },
      ]),
      this.activityModel.aggregate([
        {
          $match: {
            ...filter,
            completedDate: { $exists: true },
            scheduledDate: { $exists: true },
          },
        },
        {
          $project: {
            responseTime: {
              $subtract: ['$completedDate', '$scheduledDate'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
          },
        },
      ]),
    ]);

    return {
      total,
      completed,
      pending,
      overdue,
      byType: byType.reduce(
        (acc, item) => ({ ...acc, [item._id]: item.count }),
        {},
      ),
      byOutcome: byOutcome.reduce(
        (acc, item) => ({ ...acc, [item._id]: item.count }),
        {},
      ),
      avgResponseTimeHours: avgResponseTime[0]
        ? avgResponseTime[0].avgResponseTime / (1000 * 60 * 60)
        : 0,
    };
  }

  async scheduleFollowUp(
    opportunityId: string,
    customerId: string,
    subject: string,
    dueDate: Date,
    assignedTo: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<LeadActivityDocument> {
    return this.createActivity(
      {
        opportunityId,
        customerId,
        activityType: 'follow_up' as any,
        subject,
        dueDate: dueDate.toISOString(),
        assignedTo,
        metadata,
      },
      userId,
    );
  }

  async findById(activityId: string): Promise<LeadActivityDocument> {
    const activity = await this.activityModel.findOne({ activityId }).exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${activityId} not found`);
    }

    return activity;
  }

  async deleteActivity(activityId: string): Promise<void> {
    const result = await this.activityModel.deleteOne({ activityId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Activity with ID ${activityId} not found`);
    }
  }
}
