import { PartialType } from '@nestjs/mapped-types';
import { AutoPricingDto } from './create-tariff-settings.dto';

export class UpdateAutoPricingDto extends PartialType(AutoPricingDto) {}