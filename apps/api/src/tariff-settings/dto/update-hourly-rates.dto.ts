import { PartialType } from '@nestjs/mapped-types';
import { HourlyRatesDto } from './create-tariff-settings.dto';

export class UpdateHourlyRatesDto extends PartialType(HourlyRatesDto) {}