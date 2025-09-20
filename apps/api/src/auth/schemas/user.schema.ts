import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, UserPreferences, Permission } from '../interfaces/user.interface';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  username!: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ type: Object, required: true, index: true })
  role!: UserRole;

  @Prop()
  department?: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: [Object], required: true })
  permissions!: Permission[];

  @Prop()
  profilePicture?: string;

  @Prop()
  timezone?: string;

  @Prop({ type: Object })
  preferences?: UserPreferences;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ required: true })
  lastModifiedBy!: string;

  // Virtual for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Additional indexes (basic indexes already defined in @Prop decorators)
UserSchema.index({ 'role.name': 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastLoginAt: 1 });

// Add virtual for full name
UserSchema.virtual('fullName').get(function(this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete (ret as any).passwordHash; // Never include password hash in JSON output
    return ret;
  }
});

UserSchema.set('toObject', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete (ret as any).passwordHash; // Never include password hash in object output
    return ret;
  }
});