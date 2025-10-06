import { PartialType } from '@nestjs/mapped-types';
import { CreateDistanceRateDto } from './create-distance-rate.dto';

export class UpdateDistanceRateDto extends PartialType(CreateDistanceRateDto) {}
