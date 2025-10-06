import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  type!: string;

  @IsString()
  titleTemplate!: string;

  @IsString()
  messageTemplate!: string;

  @IsString()
  @IsOptional()
  emailSubjectTemplate?: string;

  @IsString()
  @IsOptional()
  emailBodyTemplate?: string;

  @IsString()
  @IsOptional()
  smsTemplate?: string;

  @IsObject()
  defaultChannels!: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  @IsEnum(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  defaultPriority?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
