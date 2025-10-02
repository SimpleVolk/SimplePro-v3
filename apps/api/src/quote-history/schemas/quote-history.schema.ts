import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuoteHistoryDocument = QuoteHistory & Document;

// Enums for quote status
export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVISED = 'revised',
}

// Enums for interaction types
export enum InteractionType {
  SENT = 'sent',
  VIEWED = 'viewed',
  DOWNLOADED = 'downloaded',
  QUESTION_ASKED = 'question_asked',
  REVISION_REQUESTED = 'revision_requested',
}

// Enums for sales activity types
export enum SalesActivityType {
  FOLLOW_UP_CALL = 'follow_up_call',
  EMAIL_SENT = 'email_sent',
  MEETING = 'meeting',
  NEGOTIATION = 'negotiation',
  OBJECTION_HANDLED = 'objection_handled',
}

// Enums for loss reasons
export enum LossReason {
  PRICE_TOO_HIGH = 'price_too_high',
  COMPETITOR_CHOSEN = 'competitor_chosen',
  TIMING = 'timing',
  SERVICE_NOT_NEEDED = 'service_not_needed',
  WENT_WITH_REFERRAL = 'went_with_referral',
  BUDGET_CONSTRAINTS = 'budget_constraints',
  OTHER = 'other',
}

// Enums for win reasons
export enum WinReason {
  BEST_PRICE = 'best_price',
  BEST_SERVICE = 'best_service',
  REPUTATION = 'reputation',
  TIMING = 'timing',
  RELATIONSHIP = 'relationship',
  UNIQUE_CAPABILITIES = 'unique_capabilities',
}

// Sub-schemas
@Schema({ _id: false })
export class QuoteData {
  @Prop({ required: true })
  totalPrice!: number;

  @Prop({ type: Object })
  breakdown!: Record<string, any>;

  @Prop()
  validUntil!: Date;

  @Prop()
  terms!: string;

  @Prop()
  notes!: string;
}

@Schema({ _id: false })
export class CustomerInteraction {
  @Prop({ required: true, enum: Object.values(InteractionType) })
  type!: InteractionType;

  @Prop({ required: true, default: () => new Date() })
  timestamp!: Date;

  @Prop({ type: Object })
  details!: Record<string, any>;

  @Prop()
  userId!: string;
}

@Schema({ _id: false })
export class SalesActivity {
  @Prop({ required: true, enum: Object.values(SalesActivityType) })
  activityType!: SalesActivityType;

  @Prop({ required: true, default: () => new Date() })
  timestamp!: Date;

  @Prop({ required: true })
  performedBy!: string;

  @Prop()
  outcome!: string;

  @Prop()
  notes!: string;
}

@Schema({ _id: false })
export class CompetitorInfo {
  @Prop({ default: false })
  hasCompetingQuotes!: boolean;

  @Prop({ type: [String], default: [] })
  competitorNames!: string[];

  @Prop()
  ourPriceVsCompetitor!: number; // percentage difference

  @Prop({ type: [String], default: [] })
  competitiveAdvantages!: string[];

  @Prop({ type: [String], default: [] })
  competitiveDisadvantages!: string[];
}

@Schema({ _id: false })
export class LossAnalysis {
  @Prop({ enum: Object.values(LossReason) })
  lostReason!: LossReason;

  @Prop()
  lostReasonDetails!: string;

  @Prop()
  competitorWon!: string;

  @Prop()
  priceDifference!: number;

  @Prop()
  lessonsLearned!: string;

  @Prop()
  followUpScheduled!: Date;
}

@Schema({ _id: false })
export class WinAnalysis {
  @Prop({ enum: Object.values(WinReason) })
  winReason!: WinReason;

  @Prop()
  winReasonDetails!: string;

  @Prop({ type: [String], default: [] })
  keySellingPoints!: string[];

  @Prop()
  marginAchieved!: number; // percentage

  @Prop({ type: [String], default: [] })
  upsellOpportunities!: string[];
}

@Schema({ _id: false })
export class Timeline {
  @Prop()
  quoteSentDate!: Date;

  @Prop()
  firstViewedDate!: Date;

  @Prop()
  lastViewedDate!: Date;

  @Prop({ type: [Date], default: [] })
  followUpDates!: Date[];

  @Prop()
  decisionDate!: Date;

  @Prop()
  daysToDecision!: number;

  @Prop()
  daysToFirstView!: number;

  @Prop({ default: 0 })
  totalViewCount!: number;
}

@Schema({ _id: false })
export class RevisionHistory {
  @Prop({ required: true })
  revisionNumber!: number;

  @Prop({ required: true, default: () => new Date() })
  revisedDate!: Date;

  @Prop({ required: true })
  revisedBy!: string;

  @Prop()
  priceChange!: number;

  @Prop()
  changeReason!: string;

  @Prop()
  changesDescription!: string;
}

// Main schema
@Schema({ timestamps: true })
export class QuoteHistory {
  @Prop({ required: true, unique: true, index: true })
  quoteHistoryId!: string;

  @Prop({ required: true, unique: true, index: true })
  estimateId!: string;

  @Prop({ required: true, index: true })
  opportunityId!: string;

  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({ required: true })
  quoteNumber!: string;

  @Prop({
    required: true,
    enum: Object.values(QuoteStatus),
    default: QuoteStatus.DRAFT,
    index: true,
  })
  status!: QuoteStatus;

  @Prop({ type: QuoteData, required: true })
  quoteData!: QuoteData;

  @Prop({ type: [CustomerInteraction], default: [] })
  customerInteractions!: CustomerInteraction[];

  @Prop({ type: [SalesActivity], default: [] })
  salesActivity!: SalesActivity[];

  @Prop({ type: CompetitorInfo })
  competitorInfo!: CompetitorInfo;

  @Prop({ type: LossAnalysis })
  lossAnalysis!: LossAnalysis;

  @Prop({ type: WinAnalysis })
  winAnalysis!: WinAnalysis;

  @Prop({ type: Timeline })
  timeline!: Timeline;

  @Prop({ type: [RevisionHistory], default: [] })
  revisionHistory!: RevisionHistory[];

  @Prop({ index: true })
  assignedSalesRep!: string;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ default: () => new Date() })
  createdAt!: Date;

  @Prop({ default: () => new Date() })
  updatedAt!: Date;
}

export const QuoteHistorySchema = SchemaFactory.createForClass(QuoteHistory);

// Compound indexes
QuoteHistorySchema.index({ customerId: 1, createdAt: -1 });
QuoteHistorySchema.index({ assignedSalesRep: 1, status: 1 });
QuoteHistorySchema.index({ status: 1, 'timeline.daysToDecision': 1 });
QuoteHistorySchema.index({ 'timeline.quoteSentDate': -1 });
