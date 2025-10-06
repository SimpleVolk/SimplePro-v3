import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TariffStatus,
  PricingMethodType,
} from '../interfaces/tariff-settings.interface';

/**
 * Nested DTOs for embedded objects
 */

export class HourlyRateDto {
  @IsNumber()
  @Min(1)
  crewSize!: number;

  @IsNumber()
  @Min(0)
  baseRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weekendRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  holidayRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeMultiplier?: number;
}

export class CrewAbilityEntryDto {
  @IsNumber()
  @Min(1)
  crewSize!: number;

  @IsNumber()
  @Min(0)
  maxCubicFeet!: number;

  @IsNumber()
  @Min(0)
  maxWeightLbs!: number;
}

export class MinimumHoursDto {
  @IsNumber()
  @Min(1)
  weekday!: number;

  @IsNumber()
  @Min(1)
  weekend!: number;

  @IsNumber()
  @Min(1)
  holiday!: number;
}

export class HourlyRatesDto {
  @IsBoolean()
  enabled!: boolean;

  @ValidateNested()
  @Type(() => MinimumHoursDto)
  minimumHours!: MinimumHoursDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourlyRateDto)
  rates!: HourlyRateDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewAbilityEntryDto)
  crewAbility!: CrewAbilityEntryDto[];
}

export class PackingRateDto {
  @IsString()
  @IsNotEmpty()
  itemType!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;
}

export class PackingRatesDto {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackingRateDto)
  rates!: PackingRateDto[];
}

export class AutoPricingDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1)
  maxHoursPerJob!: number;

  @IsBoolean()
  useCrewAbilityLimits!: boolean;

  @IsBoolean()
  applyWeekendSurcharge!: boolean;

  @IsNumber()
  @Min(0)
  weekendSurchargePercent!: number;

  @IsBoolean()
  applyHolidaySurcharge!: boolean;

  @IsNumber()
  @Min(0)
  holidaySurchargePercent!: number;
}

export class PricingMethodDefaultDto {
  @IsEnum(PricingMethodType)
  method!: PricingMethodType;

  @IsBoolean()
  enabled!: boolean;

  @IsBoolean()
  isDefault!: boolean;

  @IsOptional()
  configuration?: Record<string, any>;
}

/**
 * Main DTO for creating tariff settings
 */
export class CreateTariffSettingsDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(TariffStatus)
  status?: TariffStatus;

  @IsOptional()
  @IsString()
  version?: string;

  @IsDateString()
  effectiveFrom!: Date;

  @IsOptional()
  @IsDateString()
  effectiveTo?: Date;

  @ValidateNested()
  @Type(() => HourlyRatesDto)
  hourlyRates!: HourlyRatesDto;

  @ValidateNested()
  @Type(() => PackingRatesDto)
  packingRates!: PackingRatesDto;

  @ValidateNested()
  @Type(() => AutoPricingDto)
  autoPricing!: AutoPricingDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingMethodDefaultDto)
  pricingMethods?: PricingMethodDefaultDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
