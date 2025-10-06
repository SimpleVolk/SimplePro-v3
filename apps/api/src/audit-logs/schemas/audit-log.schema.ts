import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * Represents changes made to a resource
 */
export interface ResourceChanges {
  before?: Record<string, any>;
  after?: Record<string, any>;
}

/**
 * Audit Log Schema
 *
 * Captures all system activity for compliance and security purposes.
 * Logs are immutable and automatically cleaned up after 90 days.
 */
@Schema({
  collection: 'audit_logs',
  timestamps: true,
  // Make the schema immutable - prevent updates
  versionKey: false,
  minimize: false,
})
export class AuditLog {
  @Prop({ required: true, index: true })
  timestamp!: Date;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  userName!: string;

  @Prop({ required: true, index: true })
  action!: string;

  @Prop({ required: true, index: true })
  resource!: string;

  @Prop({ index: true })
  resourceId?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    index: true,
  })
  severity!: 'info' | 'warning' | 'error' | 'critical';

  @Prop({ required: true })
  ipAddress!: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  changes?: ResourceChanges;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({
    required: true,
    enum: ['success', 'failure'],
    index: true,
  })
  outcome!: 'success' | 'failure';

  @Prop()
  errorMessage?: string;

  @Prop()
  errorStack?: string;

  @Prop()
  sessionId?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for efficient querying
AuditLogSchema.index({ timestamp: -1 }); // Most common - descending order for recent first
AuditLogSchema.index({ userId: 1, timestamp: -1 }); // User activity history
AuditLogSchema.index({ action: 1, timestamp: -1 }); // Action-based queries
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 }); // Resource history
AuditLogSchema.index({ severity: 1, timestamp: -1 }); // Severity-based queries
AuditLogSchema.index({ outcome: 1, timestamp: -1 }); // Outcome-based queries

// TTL index - automatically delete logs older than 90 days
AuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

// Compound indexes for common query patterns
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });

// Make the schema immutable
AuditLogSchema.pre('save', function (next) {
  // Only allow creation, not modification
  if (!this.isNew) {
    next(new Error('Audit logs cannot be modified'));
  } else {
    next();
  }
});

// Prevent updates
AuditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate'],
  function (next) {
    next(new Error('Audit logs cannot be modified'));
  },
);

// Prevent deletions (except by TTL)
AuditLogSchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete'],
  function (next) {
    next(new Error('Audit logs cannot be manually deleted'));
  },
);
