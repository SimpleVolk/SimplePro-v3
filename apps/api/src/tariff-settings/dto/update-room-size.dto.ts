import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomSizeDto } from './create-room-size.dto';

export class UpdateRoomSizeDto extends PartialType(CreateRoomSizeDto) {}
