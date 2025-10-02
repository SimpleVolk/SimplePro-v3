import { IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ActivityOutcome } from '../schemas/lead-activity.schema';

export class CompleteActivityDto {
  @IsEnum(ActivityOutcome)
  outcome: ActivityOutcome;

  @IsDateString()
  @IsOptional()
  completedDate?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
