import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserSessionDocument = UserSession & Document;

@Schema({ collection: 'sessions', timestamps: true })
export class UserSession {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  token!: string;

  @Prop({ required: true, index: true })
  refreshToken!: string;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  @Prop({ type: Date, default: Date.now })
  lastAccessedAt!: Date;

  // SECURITY ENHANCEMENT: Additional fields for race condition detection
  @Prop({ type: Date })
  lastTokenRefreshAt?: Date;

  @Prop({ type: Number, default: 0 })
  tokenRefreshCount!: number;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: String })
  revokedReason?: string;

  // Session fingerprinting for additional security
  @Prop({ type: String })
  sessionFingerprint?: string;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Additional indexes (basic indexes already defined in @Prop decorators)
// TTL index for automatic cleanup - this one needs to be explicit
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
UserSessionSchema.index({ userId: 1, isActive: 1 });
UserSessionSchema.index({ userId: 1, refreshToken: 1, isActive: 1 });

// SECURITY ENHANCEMENT: Additional indexes for race condition protection
UserSessionSchema.index({ refreshToken: 1, isActive: 1 }, { unique: true, sparse: true });
UserSessionSchema.index({ userId: 1, lastTokenRefreshAt: -1 });
UserSessionSchema.index({ revokedAt: 1 }, { sparse: true });