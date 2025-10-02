import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ActivityType, ActivityOutcome } from '../schemas/lead-activity.schema';

export class ActivityQueryDto {
  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(ActivityType)
  @IsOptional()
  activityType?: ActivityType;

  @IsEnum(ActivityOutcome)
  @IsOptional()
  outcome?: ActivityOutcome;

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @IsString()
  @IsOptional()
  status?: 'pending' | 'completed' | 'overdue';
}
