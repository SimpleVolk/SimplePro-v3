import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  IsNotEmpty,
  IsArray,
  IsIn,
} from 'class-validator';
import { HandicapCategory } from '../interfaces/tariff-settings.interface';

export class CreateHandicapDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(HandicapCategory)
  category!: HandicapCategory;

  @IsIn(['fixed_fee', 'percentage', 'per_unit'])
  type!: 'fixed_fee' | 'percentage' | 'per_unit';

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @IsIn(['pickup', 'delivery', 'both'], { each: true })
  appliesTo!: ('pickup' | 'delivery' | 'both')[];

  @IsOptional()
  @IsString()
  notes?: string;
}
