import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateMoveSizeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  minCubicFeet!: number;

  @IsNumber()
  @Min(0)
  maxCubicFeet!: number;

  @IsNumber()
  @Min(0)
  minWeightLbs!: number;

  @IsNumber()
  @Min(0)
  maxWeightLbs!: number;

  @IsNumber()
  @Min(1)
  recommendedCrewSize!: number;

  @IsNumber()
  @Min(0)
  estimatedHours!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}