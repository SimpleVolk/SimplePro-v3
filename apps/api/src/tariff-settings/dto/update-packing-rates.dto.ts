import { PartialType } from '@nestjs/mapped-types';
import { PackingRatesDto } from './create-tariff-settings.dto';

export class UpdatePackingRatesDto extends PartialType(PackingRatesDto) {}