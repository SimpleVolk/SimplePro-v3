import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDate,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class NewCustomerDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsObject()
  address!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  companyName?: string;
}

class LocationDto {
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  buildingType!: string;

  @IsNumber()
  floorLevel!: number;

  @IsBoolean()
  elevatorAccess!: boolean;

  @IsNumber()
  stairsCount!: number;

  @IsBoolean()
  longCarry!: boolean;

  @IsNumber()
  parkingDistance!: number;

  @IsString()
  @IsNotEmpty()
  accessDifficulty!: string;

  @IsBoolean()
  narrowHallways!: boolean;

  @IsString()
  @IsOptional()
  specialNotes?: string;
}

class RoomDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  items!: any[];

  @IsBoolean()
  packingRequired!: boolean;

  @IsNumber()
  totalWeight!: number;

  @IsNumber()
  totalVolume!: number;
}

class SpecialItemsDto {
  @IsBoolean()
  piano!: boolean;

  @IsBoolean()
  poolTable!: boolean;

  @IsBoolean()
  safe!: boolean;

  @IsBoolean()
  antiques!: boolean;

  @IsBoolean()
  artwork!: boolean;

  @IsNumber()
  fragileItems!: number;

  @IsNumber()
  valuableItems!: number;
}

class AdditionalServicesDto {
  @IsString()
  @IsNotEmpty()
  packing!: string;

  @IsBoolean()
  unpacking!: boolean;

  @IsBoolean()
  assembly!: boolean;

  @IsBoolean()
  storage!: boolean;

  @IsNumber()
  @IsOptional()
  storageDuration?: number;

  @IsBoolean()
  cleaning!: boolean;
}

export class CreateOpportunityDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsEnum(['existing', 'new'])
  customerType!: 'existing' | 'new';

  @ValidateNested()
  @Type(() => NewCustomerDto)
  @IsOptional()
  newCustomer?: NewCustomerDto;

  @IsEnum(['local', 'long_distance', 'storage', 'packing_only'])
  service!: string;

  @IsDate()
  @Type(() => Date)
  moveDate!: Date;

  @IsEnum(['studio', '1br', '2br', '3br', '4br', '5br', 'custom'])
  moveSize!: string;

  @IsEnum(['exact', 'week', 'month'])
  flexibility!: string;

  @ValidateNested()
  @Type(() => LocationDto)
  pickup!: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  delivery!: LocationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomDto)
  rooms!: RoomDto[];

  @IsNumber()
  totalWeight!: number;

  @IsNumber()
  totalVolume!: number;

  @ValidateNested()
  @Type(() => SpecialItemsDto)
  specialItems!: SpecialItemsDto;

  @ValidateNested()
  @Type(() => AdditionalServicesDto)
  additionalServices!: AdditionalServicesDto;

  @IsEnum(['website', 'phone', 'referral', 'partner', 'walkin', 'other'])
  leadSource!: string;

  @IsString()
  @IsOptional()
  assignedSalesRep?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority!: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  followUpDate?: Date;

  @IsNumber()
  distance!: number;

  @IsNumber()
  estimatedDuration!: number;

  @IsNumber()
  crewSize!: number;

  @IsBoolean()
  isWeekend!: boolean;

  @IsBoolean()
  isHoliday!: boolean;

  @IsEnum(['peak', 'standard', 'off_peak'])
  seasonalPeriod!: string;

  @IsString()
  @IsOptional()
  estimateId?: string;

  @IsNumber()
  @IsOptional()
  estimatedPrice?: number;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
