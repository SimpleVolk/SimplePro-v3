import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

/**
 * Audit Logs Module
 *
 * Provides comprehensive audit logging functionality for the application.
 * Tracks all system activities, user actions, and security events.
 *
 * Features:
 * - Immutable audit log entries
 * - Advanced filtering and querying
 * - Export capabilities (CSV, JSON)
 * - Automatic cleanup via TTL indexes (90 days)
 * - Integration with all system modules
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService], // Export service for use in other modules
})
export class AuditLogsModule {}
