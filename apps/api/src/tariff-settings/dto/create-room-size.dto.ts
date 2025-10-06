import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsNotEmpty,
  IsArray,
} from 'class-validator';

export class CreateRoomSizeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  cubicFeet!: number;

  @IsNumber()
  @Min(0)
  weightLbs!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonItems?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
