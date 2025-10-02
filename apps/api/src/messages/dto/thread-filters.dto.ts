import { IsEnum, IsMongoId, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ThreadFiltersDto {
  @IsEnum(['direct', 'job', 'group'], { message: 'Invalid thread type' })
  @IsOptional()
  threadType?: string;

  @IsMongoId()
  @IsOptional()
  jobId?: string;

  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsOptional()
  includeArchived?: boolean;

  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsOptional()
  unreadOnly?: boolean;
}
