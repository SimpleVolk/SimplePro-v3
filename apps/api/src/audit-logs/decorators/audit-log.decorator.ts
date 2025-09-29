import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

/**
 * Metadata for audit logging configuration
 */
export interface AuditLogMetadata {
  action: string;
  resource: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  includeBody?: boolean;
  includeResponse?: boolean;
}

/**
 * Decorator to mark endpoints for automatic audit logging
 *
 * @param metadata - Audit log configuration
 *
 * @example
 * ```typescript
 * @AuditLog({
 *   action: 'CREATE_USER',
 *   resource: 'User',
 *   severity: 'info',
 *   includeBody: true
 * })
 * async createUser() { ... }
 * ```
 */
export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);