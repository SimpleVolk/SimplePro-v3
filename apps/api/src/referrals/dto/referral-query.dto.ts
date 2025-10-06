import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ReferralQueryDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsEnum([
    'received',
    'contacted',
    'qualified',
    'quoted',
    'won',
    'lost',
    'cancelled',
  ])
  status?: string;

  @IsOptional()
  @IsEnum(['hot', 'warm', 'cold'])
  leadQuality?: string;

  @IsOptional()
  @IsString()
  assignedSalesRep?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  pendingCommission?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

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
  @IsEnum(['referralDate', 'status', 'leadQuality', 'createdAt'])
  sortBy?: string = 'referralDate';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
