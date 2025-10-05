import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';

export class TimeOffRequestDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(['vacation', 'sick', 'personal', 'other'])
  type!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReviewTimeOffDto {
  @IsEnum(['approved', 'denied'])
  decision!: 'approved' | 'denied';

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}

export class TimeOffFiltersDto {
  @IsString()
  @IsOptional()
  crewMemberId?: string;

  @IsEnum(['pending', 'approved', 'denied'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['vacation', 'sick', 'personal', 'other'])
  @IsOptional()
  type?: string;
}
