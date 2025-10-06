import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface ChannelPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export class QuietHoursDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  start?: string; // HH:mm format

  @IsOptional()
  end?: string; // HH:mm format
}

export class UpdatePreferencesDto {
  @IsObject()
  @IsOptional()
  preferences?: Record<
    string,
    {
      inApp: boolean;
      email: boolean;
      sms: boolean;
      push: boolean;
    }
  >;

  @ValidateNested()
  @Type(() => QuietHoursDto)
  @IsOptional()
  quietHours?: QuietHoursDto;

  @IsEnum(['immediate', 'hourly', 'daily'])
  @IsOptional()
  digestMode?: string;

  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  vibrationEnabled?: boolean;
}
