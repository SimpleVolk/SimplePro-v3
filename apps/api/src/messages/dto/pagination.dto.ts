import { IsInt, Min, Max, IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @IsMongoId()
  @IsOptional()
  beforeId?: string; // Cursor-based pagination - get messages before this ID

  @IsMongoId()
  @IsOptional()
  afterId?: string; // Cursor-based pagination - get messages after this ID
}
