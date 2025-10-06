import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Room Size Schema
 * Defines standard room sizes with typical volume and weight estimates
 */
@Schema({ _id: false })
export class RoomSize {
  @Prop({ required: true, maxlength: 100 })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true, min: 0 })
  cubicFeet!: number;

  @Prop({ required: true, min: 0 })
  weightLbs!: number;

  @Prop({ type: [String], default: [] })
  commonItems!: string[];

  @Prop({ required: true, default: true })
  isActive!: boolean;
}

export const RoomSizeSchema = SchemaFactory.createForClass(RoomSize);
