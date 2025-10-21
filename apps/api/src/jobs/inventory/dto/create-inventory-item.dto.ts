import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ItemCategory, ItemCondition } from '../schemas/inventory-item.schema';

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ItemCategory)
  category!: ItemCategory;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
