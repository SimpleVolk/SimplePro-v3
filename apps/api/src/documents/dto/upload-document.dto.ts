import {
  IsEnum,
  IsMongoId,
  IsArray,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { DocumentType, EntityType } from '../schemas/document.schema';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsMongoId()
  entityId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
