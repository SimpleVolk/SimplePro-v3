import { IsBoolean, IsString, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessHoursDayDto {
  @IsBoolean()
  isOpen!: boolean;

  @ValidateIf(o => o.isOpen === true)
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Open time must be in format HH:mm (e.g., 08:00, 14:30)'
  })
  openTime?: string;

  @ValidateIf(o => o.isOpen === true)
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Close time must be in format HH:mm (e.g., 18:00, 22:30)'
  })
  closeTime?: string;
}

export class BusinessHoursDto {
  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  monday!: BusinessHoursDayDto;

  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  tuesday!: BusinessHoursDayDto;

  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  wednesday!: BusinessHoursDayDto;

  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  thursday!: BusinessHoursDayDto;

  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  friday!: BusinessHoursDayDto;

  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  saturday!: BusinessHoursDayDto;

  @ValidateNested()
  @Type(() => BusinessHoursDayDto)
  sunday!: BusinessHoursDayDto;
}