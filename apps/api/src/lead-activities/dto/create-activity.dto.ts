import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ActivityType, ActivityOutcome } from '../schemas/lead-activity.schema';

export class CreateActivityDto {
  @IsUUID()
  @IsOptional()
  activityId?: string;

  @IsString()
  @IsNotEmpty()
  opportunityId!: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsEnum(ActivityType)
  @IsNotEmpty()
  activityType!: ActivityType;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsNotEmpty()
  assignedTo!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
