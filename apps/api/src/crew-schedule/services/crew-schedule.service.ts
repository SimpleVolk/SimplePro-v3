import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CrewAvailability,
  CrewAvailabilityDocument,
} from '../schemas/crew-availability.schema';
import {
  SetAvailabilityDto,
  UpdateAvailabilityDto,
  RecurringAvailabilityDto,
} from '../dto';
import { startOfDay, endOfDay, parseISO, addDays } from 'date-fns';

export interface Conflict {
  crewMemberId: string;
  crewMemberName: string;
  reason: string;
  date: Date;
}

export interface WeeklySchedule {
  startDate: Date;
  endDate: Date;
  crewSchedules: Array<{
    crewMemberId: string;
    crewMemberName: string;
    availability: CrewAvailability[];
  }>;
}

@Injectable()
export class CrewScheduleService {
  constructor(
    @InjectModel(CrewAvailability.name)
    private crewAvailabilityModel: Model<CrewAvailabilityDocument>,
  ) {}

  async getAvailability(
    crewId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CrewAvailability[]> {
    return this.crewAvailabilityModel
      .find({
        crewMemberId: crewId,
        date: {
          $gte: startOfDay(startDate),
          $lte: endOfDay(endDate),
        },
      })
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec();
  }

  async setAvailability(
    dto: SetAvailabilityDto,
  ): Promise<CrewAvailability> {
    // Validate time range
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const date = startOfDay(parseISO(dto.date));

    // Check for existing availability on this date
    const existing = await this.crewAvailabilityModel.findOne({
      crewMemberId: dto.crewMemberId,
      date,
    });

    if (existing) {
      // Update existing
      existing.startTime = dto.startTime;
      existing.endTime = dto.endTime;
      existing.status = dto.status;
      existing.notes = dto.notes;
      return existing.save();
    }

    // Create new
    const availability = new this.crewAvailabilityModel({
      crewMemberId: dto.crewMemberId,
      date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: dto.status,
      notes: dto.notes,
      isRecurring: false,
    });

    return availability.save();
  }

  async setRecurringAvailability(
    dto: RecurringAvailabilityDto,
  ): Promise<CrewAvailability[]> {
    // Validate time range
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const effectiveFrom = parseISO(dto.effectiveFrom);
    const effectiveUntil = parseISO(dto.effectiveUntil);

    if (effectiveFrom >= effectiveUntil) {
      throw new BadRequestException(
        'effectiveFrom must be before effectiveUntil',
      );
    }

    const dayOfWeekMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDay = dayOfWeekMap[dto.recurringDay];
    const createdAvailabilities: CrewAvailability[] = [];

    let currentDate = new Date(effectiveFrom);
    while (currentDate <= effectiveUntil) {
      if (currentDate.getDay() === targetDay) {
        const availability = new this.crewAvailabilityModel({
          crewMemberId: dto.crewMemberId,
          date: startOfDay(currentDate),
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: dto.status,
          notes: dto.notes,
          isRecurring: true,
          recurringDay: dto.recurringDay,
        });

        const saved = await availability.save();
        createdAvailabilities.push(saved);
      }
      currentDate = addDays(currentDate, 1);
    }

    return createdAvailabilities;
  }

  async updateAvailability(
    id: string,
    dto: UpdateAvailabilityDto,
  ): Promise<CrewAvailability> {
    const availability = await this.crewAvailabilityModel.findById(id);
    if (!availability) {
      throw new NotFoundException(`Availability record ${id} not found`);
    }

    // Validate time range if both are provided
    const startTime = dto.startTime || availability.startTime;
    const endTime = dto.endTime || availability.endTime;
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    if (dto.startTime) availability.startTime = dto.startTime;
    if (dto.endTime) availability.endTime = dto.endTime;
    if (dto.status) availability.status = dto.status;
    if (dto.notes !== undefined) availability.notes = dto.notes;

    return availability.save();
  }

  async deleteAvailability(id: string): Promise<void> {
    const result = await this.crewAvailabilityModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Availability record ${id} not found`);
    }
  }

  async checkConflicts(_jobId: string): Promise<Conflict[]> {
    // This will be implemented once we integrate with JobsModule
    // For now, return empty array
    return [];
  }

  async getWeeklySchedule(startDate: Date): Promise<WeeklySchedule> {
    const endDate = addDays(startDate, 6);

    const availabilities = await this.crewAvailabilityModel
      .find({
        date: {
          $gte: startOfDay(startDate),
          $lte: endOfDay(endDate),
        },
      })
      .populate('crewMemberId', 'name email')
      .sort({ crewMemberId: 1, date: 1, startTime: 1 })
      .lean()
      .exec();

    // Group by crew member
    const crewMap = new Map<string, any>();
    for (const avail of availabilities) {
      const crewId = avail.crewMemberId.toString();
      if (!crewMap.has(crewId)) {
        crewMap.set(crewId, {
          crewMemberId: crewId,
          crewMemberName: (avail as any).crewMemberId.name || 'Unknown',
          availability: [],
        });
      }
      crewMap.get(crewId).availability.push(avail);
    }

    return {
      startDate,
      endDate,
      crewSchedules: Array.from(crewMap.values()),
    };
  }
}
