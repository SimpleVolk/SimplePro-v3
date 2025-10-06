import { IsOptional, IsString, IsMongoId, Matches, MaxLength, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base Query Filters DTO with NoSQL Injection Protection
 *
 * Sanitizes all query parameters to prevent MongoDB injection attacks:
 * - Removes special MongoDB operators ($, {}, etc.)
 * - Validates string patterns
 * - Enforces maximum lengths
 * - Type-safe transformations
 */
export class QueryFiltersDto {
  @ApiPropertyOptional({ description: 'Search term (alphanumeric, spaces, and basic punctuation only)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // Remove MongoDB operators and special characters that could be used for injection
    return value
      .replace(/[${}[\]]/g, '') // Remove $, {}, []
      .replace(/[^\w\s.-]/g, '') // Only allow word chars, spaces, dots, hyphens
      .trim();
  })
  search?: string;

  @ApiPropertyOptional({ description: 'MongoDB ObjectId (must be valid 24-char hex)' })
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiPropertyOptional({ description: 'Status filter (alphanumeric and underscores only)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Status must contain only letters, numbers, underscores, and hyphens'
  })
  status?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field (alphanumeric only)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Sort field must contain only letters, numbers, and underscores'
  })
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

/**
 * Customer-specific Query Filters
 */
export class CustomerQueryFiltersDto extends QueryFiltersDto {
  @ApiPropertyOptional({ description: 'Customer type filter' })
  @IsOptional()
  @IsEnum(['residential', 'commercial'])
  type?: 'residential' | 'commercial';

  @ApiPropertyOptional({ description: 'Customer status filter' })
  @IsOptional()
  @IsEnum(['lead', 'prospect', 'active', 'inactive'])
  @Transform(({ value }) => {
    return typeof value === 'string' ? value.toLowerCase() : value;
  })
  declare status?: 'lead' | 'prospect' | 'active' | 'inactive';

  @ApiPropertyOptional({ description: 'Lead source filter' })
  @IsOptional()
  @IsEnum(['website', 'referral', 'advertising', 'social_media', 'partner', 'other'])
  source?: 'website' | 'referral' | 'advertising' | 'social_media' | 'partner' | 'other';

  @ApiPropertyOptional({ description: 'Assigned sales representative ID' })
  @IsOptional()
  @IsMongoId()
  assignedSalesRep?: string;

  @ApiPropertyOptional({ description: 'Tags (comma-separated)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    return typeof value === 'string' ? value.replace(/[^\w\s,.-]/g, '') : value;
  })
  tags?: string;

  @ApiPropertyOptional({ description: 'Minimum lead score' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  leadScoreMin?: number;

  @ApiPropertyOptional({ description: 'Maximum lead score' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  leadScoreMax?: number;

  @ApiPropertyOptional({ description: 'Created after date (ISO 8601)' })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date (ISO 8601)' })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Last contact after date (ISO 8601)' })
  @IsOptional()
  @IsString()
  lastContactAfter?: string;

  @ApiPropertyOptional({ description: 'Last contact before date (ISO 8601)' })
  @IsOptional()
  @IsString()
  lastContactBefore?: string;
}

/**
 * Job-specific Query Filters
 */
export class JobQueryFiltersDto extends QueryFiltersDto {
  @ApiPropertyOptional({ description: 'Job status filter' })
  @IsOptional()
  @IsEnum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'])
  @Transform(({ value }) => {
    return typeof value === 'string' ? value.toLowerCase() : value;
  })
  declare status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

  @ApiPropertyOptional({ description: 'Job type filter' })
  @IsOptional()
  @IsEnum(['local', 'long_distance', 'packing_only', 'storage'])
  type?: 'local' | 'long_distance' | 'packing_only' | 'storage';

  @ApiPropertyOptional({ description: 'Priority filter' })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiPropertyOptional({ description: 'Customer ID (MongoDB ObjectId)' })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Assigned crew ID (MongoDB ObjectId)' })
  @IsOptional()
  @IsMongoId()
  assignedCrew?: string;

  @ApiPropertyOptional({ description: 'Scheduled after date (ISO 8601)' })
  @IsOptional()
  @IsString()
  scheduledAfter?: string;

  @ApiPropertyOptional({ description: 'Scheduled before date (ISO 8601)' })
  @IsOptional()
  @IsString()
  scheduledBefore?: string;

  @ApiPropertyOptional({ description: 'Created after date (ISO 8601)' })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date (ISO 8601)' })
  @IsOptional()
  @IsString()
  createdBefore?: string;
}

/**
 * Sanitize raw MongoDB query objects to prevent injection
 * Use this for any direct MongoDB queries
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(query)) {
    // Block MongoDB operators at top level
    if (key.startsWith('$')) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key] = value.replace(/[${}[\]]/g, '');
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
