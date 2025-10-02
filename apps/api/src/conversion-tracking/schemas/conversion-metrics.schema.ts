import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversionMetricsDocument = ConversionMetrics & Document;

// Enums for granularity
export enum MetricsGranularity {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

// Sub-schema for period
@Schema({ _id: false })
export class MetricsPeriod {
  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;
}

// Sub-schema for funnel metrics
@Schema({ _id: false })
export class FunnelMetrics {
  @Prop({ required: true, default: 0 })
  totalLeads!: number;

  @Prop({ required: true, default: 0 })
  qualifiedOpportunities!: number;

  @Prop({ required: true, default: 0 })
  quotesSent!: number;

  @Prop({ required: true, default: 0 })
  quotesAccepted!: number;

  @Prop({ required: true, default: 0 })
  jobsCreated!: number;

  @Prop({ required: true, default: 0 })
  jobsCompleted!: number;
}

// Sub-schema for conversion rates
@Schema({ _id: false })
export class ConversionRates {
  @Prop({ default: 0 })
  leadToOpportunityRate!: number;

  @Prop({ default: 0 })
  opportunityToQuoteRate!: number;

  @Prop({ default: 0 })
  quoteToJobRate!: number;

  @Prop({ default: 0 })
  overallConversionRate!: number;
}

// Sub-schema for time metrics
@Schema({ _id: false })
export class TimeMetrics {
  @Prop({ default: 0 })
  avgDaysLeadToOpportunity!: number;

  @Prop({ default: 0 })
  avgDaysOpportunityToQuote!: number;

  @Prop({ default: 0 })
  avgDaysQuoteToJob!: number;

  @Prop({ default: 0 })
  avgDaysLeadToJob!: number;
}

// Sub-schema for value metrics
@Schema({ _id: false })
export class ValueMetrics {
  @Prop({ default: 0 })
  totalQuoteValue!: number;

  @Prop({ default: 0 })
  totalJobValue!: number;

  @Prop({ default: 0 })
  avgQuoteValue!: number;

  @Prop({ default: 0 })
  avgJobValue!: number;

  @Prop({ default: 0 })
  quoteToJobValueRatio!: number;
}

// Sub-schema for loss reason breakdown
@Schema({ _id: false })
export class LossReasonBreakdown {
  @Prop({ type: Object, default: {} })
  reasonCounts!: Record<string, number>;

  @Prop({ type: Object, default: {} })
  reasonPercentages!: Record<string, number>;
}

// Sub-schema for win/loss analysis
@Schema({ _id: false })
export class WinLossAnalysis {
  @Prop({ default: 0 })
  quotesWon!: number;

  @Prop({ default: 0 })
  quotesLost!: number;

  @Prop({ default: 0 })
  winRate!: number;

  @Prop({ type: LossReasonBreakdown })
  lossReasons!: LossReasonBreakdown;
}

// Sub-schema for top performer
@Schema({ _id: false })
export class TopPerformer {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: 0 })
  winRate!: number;

  @Prop({ default: 0 })
  totalRevenue!: number;

  @Prop({ default: 0 })
  quotesCount!: number;

  @Prop({ default: 0 })
  jobsCount!: number;
}

// Sub-schema for sales performance
@Schema({ _id: false })
export class SalesPerformance {
  @Prop({ default: 0 })
  avgQuotesPerSalesRep!: number;

  @Prop({ default: 0 })
  avgWinRatePerSalesRep!: number;

  @Prop({ type: [TopPerformer], default: [] })
  topPerformers!: TopPerformer[];
}

// Main metrics schema
@Schema({ _id: false })
export class Metrics {
  @Prop({ type: FunnelMetrics, required: true })
  funnelMetrics!: FunnelMetrics;

  @Prop({ type: ConversionRates, required: true })
  conversionRates!: ConversionRates;

  @Prop({ type: TimeMetrics, required: true })
  timeMetrics!: TimeMetrics;

  @Prop({ type: ValueMetrics, required: true })
  valueMetrics!: ValueMetrics;

  @Prop({ type: WinLossAnalysis, required: true })
  winLossAnalysis!: WinLossAnalysis;

  @Prop({ type: SalesPerformance, required: true })
  salesPerformance!: SalesPerformance;
}

// Main schema
@Schema({ timestamps: true })
export class ConversionMetrics {
  @Prop({ required: true, unique: true, index: true })
  metricsId!: string;

  @Prop({ type: MetricsPeriod, required: true })
  period!: MetricsPeriod;

  @Prop({
    required: true,
    enum: Object.values(MetricsGranularity),
    index: true,
  })
  granularity!: MetricsGranularity;

  @Prop({ type: Metrics, required: true })
  metrics!: Metrics;

  @Prop({ default: () => new Date() })
  createdAt!: Date;

  @Prop({ default: () => new Date() })
  calculatedAt!: Date;
}

export const ConversionMetricsSchema =
  SchemaFactory.createForClass(ConversionMetrics);

// Compound indexes
ConversionMetricsSchema.index({ 'period.startDate': -1, granularity: 1 });
