import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsString,
  IsIn,
} from 'class-validator';

export class PreferencesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  defaultCrewSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  defaultServiceRadius?: number;

  @IsOptional()
  @IsBoolean()
  requireEstimateApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowOnlineBooking?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'], {
    message: 'Currency must be one of: USD, EUR, GBP, CAD, AUD',
  })
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], {
    message: 'Date format must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD',
  })
  dateFormat?: string;

  @IsOptional()
  @IsIn(['12h', '24h'], {
    message: 'Time format must be either 12h or 24h',
  })
  timeFormat?: '12h' | '24h';
}
