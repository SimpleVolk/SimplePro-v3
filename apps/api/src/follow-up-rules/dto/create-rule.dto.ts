import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, ActionType, RuleTrigger, RuleAction } from '../schemas/follow-up-rule.schema';

class TriggerDto implements RuleTrigger {
  @IsEnum(EventType)
  @IsNotEmpty()
  eventType: EventType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions: ConditionDto[];
}

class ConditionDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';

  @IsNotEmpty()
  value: any;
}

class ActionDto implements RuleAction {
  @IsEnum(ActionType)
  @IsNotEmpty()
  actionType: ActionType;

  @IsNumber()
  @IsNotEmpty()
  delay: number;

  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @IsOptional()
  assignTo?: string;

  @IsString()
  @IsOptional()
  activityType?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateRuleDto {
  @IsUUID()
  @IsOptional()
  ruleId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => TriggerDto)
  @IsNotEmpty()
  trigger: TriggerDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  @IsNotEmpty()
  actions: ActionDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}
