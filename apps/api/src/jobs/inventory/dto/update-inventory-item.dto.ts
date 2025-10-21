import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ItemCategory, ItemCondition, ItemStatus } from '../schemas/inventory-item.schema';

export class UpdateInventoryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ItemCategory)
  @IsOptional()
  category?: ItemCategory;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatus;

  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
