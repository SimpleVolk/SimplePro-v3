import {
  IsString,
  IsEnum,
  IsOptional,
  IsDate,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AuditOutcome = 'success' | 'failure';

/**
 * DTO for querying audit logs with filtering and pagination
 */
export class QueryAuditLogDto {
  // Date range filters
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  // User filters
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userName?: string;

  // Action and resource filters
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsString()
  @IsOptional()
  resourceId?: string;

  // Severity filter
  @IsEnum(['info', 'warning', 'error', 'critical'])
  @IsOptional()
  severity?: AuditSeverity;

  // Outcome filter
  @IsEnum(['success', 'failure'])
  @IsOptional()
  outcome?: AuditOutcome;

  // Search term (searches across userName, action, resource)
  @IsString()
  @IsOptional()
  search?: string;

  // IP Address filter
  @IsString()
  @IsOptional()
  ipAddress?: string;

  // Session ID filter
  @IsString()
  @IsOptional()
  sessionId?: string;

  // Pagination
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  skip?: number = 0;

  // Sorting
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsString()
  @IsOptional()
  sortBy?: string = 'timestamp';
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv';

/**
 * DTO for exporting audit logs
 */
export class ExportAuditLogDto extends QueryAuditLogDto {
  @IsEnum(['json', 'csv'])
  format!: ExportFormat;
}
