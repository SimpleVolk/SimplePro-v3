import { PartialType } from '@nestjs/mapped-types';
import { CreateTariffSettingsDto } from './create-tariff-settings.dto';

export class UpdateTariffSettingsDto extends PartialType(
  CreateTariffSettingsDto,
) {}
