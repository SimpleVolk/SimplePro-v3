import { IsDate, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShareLinkDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date; // Default: 7 days from now

  @IsString()
  @IsOptional()
  password?: string;
}
