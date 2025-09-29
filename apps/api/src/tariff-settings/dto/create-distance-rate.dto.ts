import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateDistanceRateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  minMiles!: number;

  @IsNumber()
  @Min(0)
  maxMiles!: number;

  @IsNumber()
  @Min(0)
  ratePerMile!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumCharge?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}