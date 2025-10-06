import { IsOptional, IsString, IsEmail, Length, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';
import { BusinessHoursDto } from './business-hours.dto';
import { PreferencesDto } from './preferences.dto';

export class UpdateCompanySettingsDto {
  // Company Profile
  @IsOptional()
  @IsString()
  @Length(1, 200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}-\d{7}$/, {
    message: 'Tax ID must be in format XX-XXXXXXX (e.g., 12-3456789)'
  })
  taxId?: string;

  // Contact Information
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/, {
    message: 'Phone must be a valid US phone number (e.g., (555) 123-4567 or 555-123-4567)'
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, {
    message: 'Website must be a valid URL'
  })
  website?: string;

  // Address
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  // Business Hours
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto;

  // Preferences
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}