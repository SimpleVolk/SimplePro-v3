import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

enum ServiceType {
  LOCAL = 'local',
  LONG_DISTANCE = 'long_distance',
  PACKING_ONLY = 'packing_only',
}

class SpecialItemsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  piano?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  antiques?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  artwork?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fragileItems?: number;
}

class InventoryDto {
  @IsNumber()
  @Min(0)
  @Max(50000)
  weight!: number;

  @IsNumber()
  @Min(0)
  @Max(10000)
  volume!: number;

  @IsNumber()
  @Min(1)
  @Max(20)
  crewSize!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SpecialItemsDto)
  specialItems?: SpecialItemsDto;
}

class LocationDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  address!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  stairs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  longCarry?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  difficultAccess?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  parkingDistance?: number;

  @IsOptional()
  @IsBoolean()
  narrowHallways?: boolean;
}

class LocationsDto {
  @ValidateNested()
  @Type(() => LocationDto)
  pickup!: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  delivery!: LocationDto;
}

class ServicesDto {
  @IsOptional()
  @IsBoolean()
  packing?: boolean;

  @IsOptional()
  @IsBoolean()
  assembly?: boolean;

  @IsOptional()
  @IsBoolean()
  storage?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  storageDuration?: number;
}

export class CreateEstimateDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message:
      'Customer name can only contain letters, spaces, apostrophes, and hyphens',
  })
  customerName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Customer email must be a valid email address' })
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, {
    message: 'Customer phone must be a valid phone number',
  })
  customerPhone?: string;

  @IsEnum(ServiceType, {
    message: 'Service type must be local, long_distance, or packing_only',
  })
  serviceType!: ServiceType;

  @IsDateString({}, { message: 'Move date must be a valid ISO date string' })
  moveDate!: string;

  @ValidateNested()
  @Type(() => InventoryDto)
  inventory!: InventoryDto;

  @ValidateNested()
  @Type(() => LocationsDto)
  locations!: LocationsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServicesDto)
  services?: ServicesDto;
}
