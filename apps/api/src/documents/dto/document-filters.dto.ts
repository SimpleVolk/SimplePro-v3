import {
  IsEnum,
  IsMongoId,
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, EntityType } from '../schemas/document.schema';

export class DocumentFiltersDto {
  @IsEnum(EntityType)
  @IsOptional()
  entityType?: EntityType;

  @IsMongoId()
  @IsOptional()
  entityId?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @IsString()
  @IsOptional()
  search?: string; // Search in filename, description, tags

  @IsMongoId()
  @IsOptional()
  uploadedBy?: string;

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit = 50;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset = 0;
}
