import { PartialType } from '@nestjs/mapped-types';
import { CreateHandicapDto } from './create-handicap.dto';

export class UpdateHandicapDto extends PartialType(CreateHandicapDto) {}