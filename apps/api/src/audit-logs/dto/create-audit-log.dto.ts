import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDate,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AuditOutcome = 'success' | 'failure';

/**
 * DTO for creating audit log entries
 */
export class CreateAuditLogDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  timestamp?: Date;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  userName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  action!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resource!: string;

  @IsString()
  @IsOptional()
  resourceId?: string;

  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity!: AuditSeverity;

  @IsString()
  @IsNotEmpty()
  ipAddress!: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsObject()
  @IsOptional()
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(['success', 'failure'])
  outcome!: AuditOutcome;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  errorMessage?: string;

  @IsString()
  @IsOptional()
  errorStack?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

/**
 * Simplified audit log creation for internal use
 */
export interface AuditLogContext {
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
}
