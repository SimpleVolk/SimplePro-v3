import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PartnerQueryDto {
  @IsOptional()
  @IsEnum([
    'real_estate_agent',
    'property_manager',
    'relocation_company',
    'storage_facility',
    'corporate_client',
    'referral_network',
    'other'
  ])
  partnerType?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending', 'suspended'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['totalLeadsReferred', 'totalRevenue', 'conversionRate', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
