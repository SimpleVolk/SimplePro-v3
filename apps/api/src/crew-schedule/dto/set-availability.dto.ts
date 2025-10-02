import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  Matches,
  IsMongoId,
} from 'class-validator';

export class SetAvailabilityDto {
  @IsMongoId()
  crewMemberId: string;

  @IsDateString()
  date: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @IsEnum(['available', 'busy', 'time_off'])
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateAvailabilityDto {
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  @IsOptional()
  endTime?: string;

  @IsEnum(['available', 'busy', 'time_off'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecurringAvailabilityDto {
  @IsMongoId()
  crewMemberId: string;

  @IsEnum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  recurringDay: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @IsEnum(['available', 'busy', 'time_off'])
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsDateString()
  effectiveUntil: string;
}
