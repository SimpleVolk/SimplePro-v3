import {
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationDto {
  @IsMongoId()
  recipientId!: string;

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
  type!: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>; // Data for template rendering

  @IsEnum(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @IsMongoId()
  @IsOptional()
  relatedEntityId?: string;

  @IsObject()
  @IsOptional()
  actionData?: {
    type: 'navigate' | 'action';
    route?: string;
    action?: string;
    params?: Record<string, any>;
  };
}
