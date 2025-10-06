import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class CommissionTierDto {
  @IsNumber()
  @Min(0)
  minValue!: number;

  @IsNumber()
  @Min(0)
  maxValue!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate!: number;
}

class CommissionStructureDto {
  @IsEnum(['percentage', 'flat_rate', 'tiered', 'custom'])
  type!: 'percentage' | 'flat_rate' | 'tiered' | 'custom';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flatAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  tiers?: CommissionTierDto[];

  @IsString()
  paymentTerms!: string; // 'net30', 'net60', etc.
}

class AddressDto {
  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  zipCode!: string;

  @IsOptional()
  @IsString()
  country?: string;
}

class PartnerSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoNotifyOnLeadUpdate?: boolean;

  @IsOptional()
  @IsEnum(['email', 'phone', 'portal'])
  preferredContactMethod?: 'email' | 'phone' | 'portal';

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export class CreatePartnerDto {
  @IsString()
  companyName!: string;

  @IsString()
  contactName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsEnum([
    'real_estate_agent',
    'property_manager',
    'relocation_company',
    'storage_facility',
    'corporate_client',
    'referral_network',
    'other',
  ])
  partnerType!: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending', 'suspended'])
  status?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CommissionStructureDto)
  commissionStructure!: CommissionStructureDto;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PartnerSettingsDto)
  settings?: PartnerSettingsDto;
}
