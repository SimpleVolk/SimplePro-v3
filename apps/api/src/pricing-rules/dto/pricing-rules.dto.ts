import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsNotEmpty,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums for validation
export enum OperatorType {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with'
}

export enum ActionType {
  ADD_FIXED = 'add_fixed',
  ADD_PERCENTAGE = 'add_percentage',
  SUBTRACT_FIXED = 'subtract_fixed',
  SUBTRACT_PERCENTAGE = 'subtract_percentage',
  MULTIPLY = 'multiply',
  SET_FIXED = 'set_fixed',
  SET_PERCENTAGE = 'set_percentage'
}

export enum ServiceType {
  LOCAL = 'local',
  LONG_DISTANCE = 'long_distance',
  STORAGE = 'storage',
  PACKING_ONLY = 'packing_only'
}

export enum RuleCategory {
  BASE_PRICING = 'base_pricing',
  CREW_ADJUSTMENTS = 'crew_adjustments',
  WEIGHT_VOLUME = 'weight_volume',
  DISTANCE = 'distance',
  TIMING = 'timing',
  SPECIAL_ITEMS = 'special_items',
  LOCATION_HANDICAPS = 'location_handicaps',
  ADDITIONAL_SERVICES = 'additional_services'
}

// Condition DTO
export class RuleConditionDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsEnum(OperatorType)
  operator!: OperatorType;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsArray()
  values?: any[];
}

// Action DTO
export class RuleActionDto {
  @IsEnum(ActionType)
  type!: ActionType;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  targetField!: string;

  @IsOptional()
  @IsString()
  condition?: string;
}

// Base Rule DTO
export class CreatePricingRuleDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(RuleCategory)
  category!: RuleCategory;

  @IsNumber()
  @Min(1)
  @Max(1000)
  priority!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions!: RuleConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions!: RuleActionDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsArray()
  @IsEnum(ServiceType, { each: true })
  applicableServices!: ServiceType[];

  @IsString()
  @IsOptional()
  version?: string = '1.0.0';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  effectiveDate?: Date;

  @IsOptional()
  expiryDate?: Date;
}

// Update Rule DTO
export class UpdatePricingRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(RuleCategory)
  category?: RuleCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions?: RuleActionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(ServiceType, { each: true })
  applicableServices?: ServiceType[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  effectiveDate?: Date;

  @IsOptional()
  expiryDate?: Date;
}

// Test Rule DTO
export class TestRuleDto {
  @ValidateNested()
  @Type(() => CreatePricingRuleDto)
  rule!: CreatePricingRuleDto;

  @IsOptional()
  testData?: {
    service?: ServiceType;
    totalWeight?: number;
    totalVolume?: number;
    distance?: number;
    crewSize?: number;
    isWeekend?: boolean;
    isHoliday?: boolean;
    seasonalPeriod?: string;
    specialItems?: Record<string, boolean>;
    pickup?: {
      floorLevel?: number;
      elevatorAccess?: boolean;
      accessDifficulty?: string;
      stairsCount?: number;
    };
    delivery?: {
      floorLevel?: number;
      elevatorAccess?: boolean;
      accessDifficulty?: string;
      stairsCount?: number;
    };
  };
}

// Filter DTO for rule queries
export class RuleFilterDto {
  @IsOptional()
  @IsEnum(RuleCategory)
  category?: RuleCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ServiceType)
  service?: ServiceType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'priority';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

// Response DTOs
export interface RuleTestResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  conditionsEvaluated: {
    condition: RuleConditionDto;
    result: boolean;
    actualValue: any;
  }[];
  actionsApplied?: RuleActionDto[];
  priceImpact?: number;
  errors?: string[];
}

export interface RuleHistoryEntry {
  id: string;
  ruleId: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  changes: Record<string, { old: any; new: any }>;
  userId: string;
  userName: string;
  timestamp: Date;
  reason?: string;
}

export interface RuleBackup {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  rulesCount: number;
  description: string;
  rules: any[];
}