import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class NotificationFiltersDto {
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  unreadOnly?: boolean;

  @IsEnum([
    'job_assigned',
    'shift_reminder',
    'customer_inquiry',
    'quote_request',
    'job_completed',
    'payment_received',
    'system_alert',
    'message_received',
    'time_off_approved',
    'time_off_denied',
    'schedule_change',
    'document_uploaded',
  ])
  @IsOptional()
  type?: string;

  @IsEnum(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  skip?: number = 0;
}
