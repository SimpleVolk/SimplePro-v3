import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TimeOffRequest,
  TimeOffRequestDocument,
} from '../schemas/time-off-request.schema';
import {
  TimeOffRequestDto,
  TimeOffFiltersDto,
} from '../dto';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class TimeOffService {
  constructor(
    @InjectModel(TimeOffRequest.name)
    private timeOffRequestModel: Model<TimeOffRequestDocument>,
  ) {}

  async requestTimeOff(
    dto: TimeOffRequestDto,
    userId: string,
  ): Promise<TimeOffRequest> {
    const startDate = parseISO(dto.startDate);
    const endDate = parseISO(dto.endDate);

    // Validate date range
    if (startDate >= endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    // Check for overlapping requests
    const overlapping = await this.timeOffRequestModel.findOne({
      crewMemberId: userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (overlapping) {
      throw new BadRequestException(
        'Time off request overlaps with existing request',
      );
    }

    const request = new this.timeOffRequestModel({
      crewMemberId: userId,
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
      type: dto.type,
      reason: dto.reason,
      status: 'pending',
    });

    return request.save();
  }

  async reviewTimeOffRequest(
    id: string,
    decision: 'approved' | 'denied',
    reviewerId: string,
    notes?: string,
  ): Promise<TimeOffRequest> {
    const request = await this.timeOffRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException(`Time off request ${id} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(
        `Time off request already ${request.status}`,
      );
    }

    request.status = decision;
    request.reviewedBy = reviewerId as any;
    request.reviewedAt = new Date();
    request.reviewNotes = notes;

    return request.save();
  }

  async getTimeOffRequests(
    filters: TimeOffFiltersDto,
  ): Promise<TimeOffRequest[]> {
    const query: any = {};

    if (filters.crewMemberId) {
      query.crewMemberId = filters.crewMemberId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      query.$and = [];
      if (filters.startDate) {
        query.$and.push({
          endDate: { $gte: startOfDay(parseISO(filters.startDate)) },
        });
      }
      if (filters.endDate) {
        query.$and.push({
          startDate: { $lte: endOfDay(parseISO(filters.endDate)) },
        });
      }
    }

    return this.timeOffRequestModel
      .find(query)
      .populate('crewMemberId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ startDate: -1 })
      .lean()
      .exec();
  }

  async cancelTimeOffRequest(id: string, userId: string): Promise<void> {
    const request = await this.timeOffRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException(`Time off request ${id} not found`);
    }

    // Only the requester can cancel their own pending request
    if (request.crewMemberId.toString() !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own time off requests',
      );
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(
        `Cannot cancel ${request.status} time off request`,
      );
    }

    await this.timeOffRequestModel.findByIdAndDelete(id);
  }

  async getUpcomingTimeOff(crewId: string): Promise<TimeOffRequest[]> {
    const now = new Date();
    return this.timeOffRequestModel
      .find({
        crewMemberId: crewId,
        status: 'approved',
        endDate: { $gte: now },
      })
      .sort({ startDate: 1 })
      .limit(10)
      .lean()
      .exec();
  }

  async isOnTimeOff(crewId: string, date: Date): Promise<boolean> {
    const count = await this.timeOffRequestModel.countDocuments({
      crewMemberId: crewId,
      status: 'approved',
      startDate: { $lte: endOfDay(date) },
      endDate: { $gte: startOfDay(date) },
    });

    return count > 0;
  }
}
