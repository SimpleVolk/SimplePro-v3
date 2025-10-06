import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsObject,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @IsString()
  filename!: string;

  @IsString()
  url!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  size!: number;
}

class LocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  @IsOptional()
  address?: string;
}

export class SendMessageDto {
  @IsMongoId()
  threadId!: string;

  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content!: string;

  @IsEnum(['text', 'image', 'file', 'location', 'quick_reply'], {
    message: 'Invalid message type',
  })
  @IsOptional()
  messageType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsMongoId()
  @IsOptional()
  replyToId?: string;
}
