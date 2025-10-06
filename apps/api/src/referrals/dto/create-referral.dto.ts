import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CustomerInfoDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;
}

class MoveDetailsDto {
  @IsOptional()
  @IsDateString()
  moveDate?: string;

  @IsEnum(['local', 'long_distance', 'storage'])
  moveType!: 'local' | 'long_distance' | 'storage';

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;
}

export class CreateReferralDto {
  @IsString()
  partnerId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  referralDate?: string;

  @IsOptional()
  @IsEnum(['hot', 'warm', 'cold'])
  leadQuality?: 'hot' | 'warm' | 'cold';

  @IsObject()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo!: CustomerInfoDto;

  @IsObject()
  @ValidateNested()
  @Type(() => MoveDetailsDto)
  moveDetails!: MoveDetailsDto;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  assignedSalesRep?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
