import { PartialType } from '@nestjs/mapped-types';
import { CreateMoveSizeDto } from './create-move-size.dto';

export class UpdateMoveSizeDto extends PartialType(CreateMoveSizeDto) {}
