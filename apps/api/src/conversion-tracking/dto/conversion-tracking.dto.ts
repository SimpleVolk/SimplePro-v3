import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  ConversionEventType,
  SourceChannel,
} from '../schemas/conversion-event.schema';

export class TrackEventDto {
  @IsEnum(ConversionEventType)
  @IsNotEmpty()
  eventType!: ConversionEventType;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  estimateId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsObject()
  @IsOptional()
  eventData?: Record<string, any>;

  @IsString()
  @IsOptional()
  performedBy?: string;

  @IsEnum(SourceChannel)
  @IsOptional()
  sourceChannel?: SourceChannel;
}

export class DateRangeQueryDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}

export class MetricsQueryDto {
  @IsDateString()
  @IsNotEmpty()
  date!: string;
}

export class MonthlyMetricsQueryDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  month!: number;

  @IsNumber()
  @Min(2020)
  @Max(2050)
  @IsNotEmpty()
  year!: number;
}

export class RevenueForecastQueryDto {
  @IsNumber()
  @Min(1)
  @Max(24)
  @IsNotEmpty()
  months!: number;
}

export class LeaderboardQueryDto extends DateRangeQueryDto {
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}
