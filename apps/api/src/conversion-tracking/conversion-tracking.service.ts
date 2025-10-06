import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversionEvent,
  ConversionEventDocument,
  ConversionEventType,
} from './schemas/conversion-event.schema';
import {
  ConversionMetrics,
  ConversionMetricsDocument,
  MetricsGranularity,
} from './schemas/conversion-metrics.schema';
import { TrackEventDto } from './dto/conversion-tracking.dto';

@Injectable()
export class ConversionTrackingService {
  constructor(
    @InjectModel(ConversionEvent.name)
    private conversionEventModel: Model<ConversionEventDocument>,
    @InjectModel(ConversionMetrics.name)
    private conversionMetricsModel: Model<ConversionMetricsDocument>,
  ) {}

  // Event tracking
  async trackEvent(dto: TrackEventDto): Promise<ConversionEvent> {
    const eventId = uuidv4();

    const event = new this.conversionEventModel({
      eventId,
      customerId: dto.customerId,
      opportunityId: dto.opportunityId,
      estimateId: dto.estimateId,
      jobId: dto.jobId,
      eventType: dto.eventType,
      eventDate: new Date(),
      eventData: dto.eventData || {},
      performedBy: dto.performedBy,
      sourceChannel: dto.sourceChannel,
    });

    return event.save();
  }

  async trackTouchpoint(
    customerId: string,
    channel: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Find all events for this customer to update attribution
    const events = await this.conversionEventModel
      .find({ customerId })
      .sort({ eventDate: 1 })
      .exec();

    if (events.length === 0) return;

    const firstEvent = events[0];

    // Update first touch if not set
    if (!firstEvent.attribution?.firstTouchChannel) {
      firstEvent.attribution = {
        firstTouchChannel: channel,
        lastTouchChannel: channel,
        touchpoints: [{ channel, date: new Date(), metadata: metadata || {} }],
      };
      await firstEvent.save();
    }

    // Update last touch for all events
    for (const event of events) {
      if (!event.attribution) {
        event.attribution = {
          firstTouchChannel:
            firstEvent.attribution?.firstTouchChannel || channel,
          lastTouchChannel: channel,
          touchpoints: [],
        };
      } else {
        event.attribution.lastTouchChannel = channel;
      }

      event.attribution.touchpoints.push({
        channel,
        date: new Date(),
        metadata: metadata || {},
      });

      await event.save();
    }
  }

  // Conversion funnel
  async getConversionFunnel(startDate: Date, endDate: Date): Promise<any> {
    const events = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const funnelStages = [
      {
        stage: 'Leads',
        eventType: ConversionEventType.LEAD_CREATED,
        count: 0,
        value: 0,
      },
      {
        stage: 'Opportunities',
        eventType: ConversionEventType.OPPORTUNITY_CREATED,
        count: 0,
        value: 0,
      },
      {
        stage: 'Quotes Sent',
        eventType: ConversionEventType.QUOTE_SENT,
        count: 0,
        value: 0,
      },
      {
        stage: 'Quotes Accepted',
        eventType: ConversionEventType.QUOTE_ACCEPTED,
        count: 0,
        value: 0,
      },
      {
        stage: 'Jobs Created',
        eventType: ConversionEventType.JOB_CREATED,
        count: 0,
        value: 0,
      },
    ];

    funnelStages.forEach((stage) => {
      const stageEvents = events.filter((e) => e.eventType === stage.eventType);
      stage.count = stageEvents.length;

      // Calculate total value for stages with pricing data
      if (stage.eventType === ConversionEventType.QUOTE_SENT) {
        stage.value = stageEvents.reduce(
          (sum, e) => sum + (e.eventData?.quoteValue || 0),
          0,
        );
      } else if (stage.eventType === ConversionEventType.JOB_CREATED) {
        stage.value = stageEvents.reduce(
          (sum, e) => sum + (e.eventData?.jobValue || 0),
          0,
        );
      }
    });

    // Calculate conversion rates
    const result = funnelStages.map((stage, index) => {
      let conversionRate = null;
      if (index > 0 && funnelStages[index - 1].count > 0) {
        conversionRate = (stage.count / funnelStages[index - 1].count) * 100;
      }

      return {
        ...stage,
        conversionRate: conversionRate
          ? parseFloat(conversionRate.toFixed(1))
          : null,
      };
    });

    return {
      funnelStages: result,
      period: { startDate, endDate },
    };
  }

  async getConversionRates(startDate: Date, endDate: Date): Promise<any> {
    const funnel = await this.getConversionFunnel(startDate, endDate);
    const stages = funnel.funnelStages;

    const leads = stages.find((s: any) => s.stage === 'Leads')?.count || 0;
    const opportunities =
      stages.find((s: any) => s.stage === 'Opportunities')?.count || 0;
    const quotes =
      stages.find((s: any) => s.stage === 'Quotes Sent')?.count || 0;
    const jobs =
      stages.find((s: any) => s.stage === 'Jobs Created')?.count || 0;

    return {
      leadToOpportunityRate:
        leads > 0 ? parseFloat(((opportunities / leads) * 100).toFixed(1)) : 0,
      opportunityToQuoteRate:
        opportunities > 0
          ? parseFloat(((quotes / opportunities) * 100).toFixed(1))
          : 0,
      quoteToJobRate:
        quotes > 0 ? parseFloat(((jobs / quotes) * 100).toFixed(1)) : 0,
      overallConversionRate:
        leads > 0 ? parseFloat(((jobs / leads) * 100).toFixed(1)) : 0,
    };
  }

  // Attribution reporting
  async getAttributionReport(startDate: Date, endDate: Date): Promise<any> {
    const events = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        eventType: ConversionEventType.JOB_CREATED,
      })
      .exec();

    const firstTouchAttribution: Record<string, number> = {};
    const lastTouchAttribution: Record<string, number> = {};

    events.forEach((event) => {
      const firstTouch = event.attribution?.firstTouchChannel;
      const lastTouch = event.attribution?.lastTouchChannel;
      const jobValue = event.eventData?.jobValue || 0;

      if (firstTouch) {
        firstTouchAttribution[firstTouch] =
          (firstTouchAttribution[firstTouch] || 0) + jobValue;
      }

      if (lastTouch) {
        lastTouchAttribution[lastTouch] =
          (lastTouchAttribution[lastTouch] || 0) + jobValue;
      }
    });

    return {
      totalConversions: events.length,
      totalRevenue: events.reduce(
        (sum, e) => sum + (e.eventData?.jobValue || 0),
        0,
      ),
      firstTouchAttribution: Object.entries(firstTouchAttribution).map(
        ([channel, revenue]) => ({
          channel,
          revenue,
          conversions: events.filter(
            (e) => e.attribution?.firstTouchChannel === channel,
          ).length,
        }),
      ),
      lastTouchAttribution: Object.entries(lastTouchAttribution).map(
        ([channel, revenue]) => ({
          channel,
          revenue,
          conversions: events.filter(
            (e) => e.attribution?.lastTouchChannel === channel,
          ).length,
        }),
      ),
    };
  }

  // Metrics calculation
  async calculateDailyMetrics(date: Date): Promise<ConversionMetrics> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const metrics = await this.calculateMetricsForPeriod(
      startDate,
      endDate,
      MetricsGranularity.DAILY,
    );

    return metrics;
  }

  async calculateWeeklyMetrics(startDate: Date): Promise<ConversionMetrics> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const metrics = await this.calculateMetricsForPeriod(
      startDate,
      endDate,
      MetricsGranularity.WEEKLY,
    );

    return metrics;
  }

  async calculateMonthlyMetrics(
    month: number,
    year: number,
  ): Promise<ConversionMetrics> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const metrics = await this.calculateMetricsForPeriod(
      startDate,
      endDate,
      MetricsGranularity.MONTHLY,
    );

    return metrics;
  }

  private async calculateMetricsForPeriod(
    startDate: Date,
    endDate: Date,
    granularity: MetricsGranularity,
  ): Promise<ConversionMetrics> {
    const metricsId = uuidv4();

    const funnel = await this.getConversionFunnel(startDate, endDate);
    const rates = await this.getConversionRates(startDate, endDate);

    const stages = funnel.funnelStages;

    // Calculate time metrics
    const timeMetrics = await this.calculateTimeMetrics(startDate, endDate);

    // Calculate value metrics
    const valueMetrics = await this.calculateValueMetrics(startDate, endDate);

    // Calculate win/loss analysis
    const winLossAnalysis = await this.calculateWinLossAnalysis(
      startDate,
      endDate,
    );

    // Calculate sales performance
    const salesPerformance = await this.calculateSalesPerformance(
      startDate,
      endDate,
    );

    const metricsData = new this.conversionMetricsModel({
      metricsId,
      period: { startDate, endDate },
      granularity,
      metrics: {
        funnelMetrics: {
          totalLeads: stages.find((s: any) => s.stage === 'Leads')?.count || 0,
          qualifiedOpportunities:
            stages.find((s: any) => s.stage === 'Opportunities')?.count || 0,
          quotesSent:
            stages.find((s: any) => s.stage === 'Quotes Sent')?.count || 0,
          quotesAccepted:
            stages.find((s: any) => s.stage === 'Quotes Accepted')?.count || 0,
          jobsCreated:
            stages.find((s: any) => s.stage === 'Jobs Created')?.count || 0,
          jobsCompleted: 0, // TODO: Add jobs completed tracking
        },
        conversionRates: rates,
        timeMetrics,
        valueMetrics,
        winLossAnalysis,
        salesPerformance,
      },
      calculatedAt: new Date(),
    });

    return metricsData.save();
  }

  private async calculateTimeMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const events = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
      })
      .exec();

    // Group events by customer to calculate time differences
    const customerEvents = new Map<string, ConversionEvent[]>();
    events.forEach((event) => {
      const existing = customerEvents.get(event.customerId) || [];
      existing.push(event);
      customerEvents.set(event.customerId, existing);
    });

    let totalLeadToOpp = 0;
    let totalOppToQuote = 0;
    let totalQuoteToJob = 0;
    let totalLeadToJob = 0;
    let countLeadToOpp = 0;
    let countOppToQuote = 0;
    let countQuoteToJob = 0;
    let countLeadToJob = 0;

    customerEvents.forEach((customerEventList) => {
      const sorted = customerEventList.sort(
        (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
      );

      const lead = sorted.find(
        (e) => e.eventType === ConversionEventType.LEAD_CREATED,
      );
      const opp = sorted.find(
        (e) => e.eventType === ConversionEventType.OPPORTUNITY_CREATED,
      );
      const quote = sorted.find(
        (e) => e.eventType === ConversionEventType.QUOTE_SENT,
      );
      const job = sorted.find(
        (e) => e.eventType === ConversionEventType.JOB_CREATED,
      );

      if (lead && opp) {
        totalLeadToOpp +=
          (opp.eventDate.getTime() - lead.eventDate.getTime()) /
          (1000 * 60 * 60 * 24);
        countLeadToOpp++;
      }

      if (opp && quote) {
        totalOppToQuote +=
          (quote.eventDate.getTime() - opp.eventDate.getTime()) /
          (1000 * 60 * 60 * 24);
        countOppToQuote++;
      }

      if (quote && job) {
        totalQuoteToJob +=
          (job.eventDate.getTime() - quote.eventDate.getTime()) /
          (1000 * 60 * 60 * 24);
        countQuoteToJob++;
      }

      if (lead && job) {
        totalLeadToJob +=
          (job.eventDate.getTime() - lead.eventDate.getTime()) /
          (1000 * 60 * 60 * 24);
        countLeadToJob++;
      }
    });

    return {
      avgDaysLeadToOpportunity:
        countLeadToOpp > 0
          ? parseFloat((totalLeadToOpp / countLeadToOpp).toFixed(1))
          : 0,
      avgDaysOpportunityToQuote:
        countOppToQuote > 0
          ? parseFloat((totalOppToQuote / countOppToQuote).toFixed(1))
          : 0,
      avgDaysQuoteToJob:
        countQuoteToJob > 0
          ? parseFloat((totalQuoteToJob / countQuoteToJob).toFixed(1))
          : 0,
      avgDaysLeadToJob:
        countLeadToJob > 0
          ? parseFloat((totalLeadToJob / countLeadToJob).toFixed(1))
          : 0,
    };
  }

  private async calculateValueMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const quoteEvents = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        eventType: ConversionEventType.QUOTE_SENT,
      })
      .exec();

    const jobEvents = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        eventType: ConversionEventType.JOB_CREATED,
      })
      .exec();

    const totalQuoteValue = quoteEvents.reduce(
      (sum, e) => sum + (e.eventData?.quoteValue || 0),
      0,
    );
    const totalJobValue = jobEvents.reduce(
      (sum, e) => sum + (e.eventData?.jobValue || 0),
      0,
    );

    return {
      totalQuoteValue,
      totalJobValue,
      avgQuoteValue:
        quoteEvents.length > 0
          ? parseFloat((totalQuoteValue / quoteEvents.length).toFixed(2))
          : 0,
      avgJobValue:
        jobEvents.length > 0
          ? parseFloat((totalJobValue / jobEvents.length).toFixed(2))
          : 0,
      quoteToJobValueRatio:
        totalQuoteValue > 0
          ? parseFloat(((totalJobValue / totalQuoteValue) * 100).toFixed(1))
          : 0,
    };
  }

  private async calculateWinLossAnalysis(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const acceptedEvents = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        eventType: ConversionEventType.QUOTE_ACCEPTED,
      })
      .exec();

    const rejectedEvents = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        eventType: ConversionEventType.QUOTE_REJECTED,
      })
      .exec();

    const totalQuotes = acceptedEvents.length + rejectedEvents.length;

    return {
      quotesWon: acceptedEvents.length,
      quotesLost: rejectedEvents.length,
      winRate:
        totalQuotes > 0
          ? parseFloat(((acceptedEvents.length / totalQuotes) * 100).toFixed(1))
          : 0,
      lossReasons: {
        reasonCounts: {},
        reasonPercentages: {},
      },
    };
  }

  private async calculateSalesPerformance(
    _startDate: Date,
    _endDate: Date,
  ): Promise<any> {
    // This would integrate with user/sales rep data
    // For now, return basic structure
    return {
      avgQuotesPerSalesRep: 0,
      avgWinRatePerSalesRep: 0,
      topPerformers: [],
    };
  }

  // Pipeline analysis
  async getPipelineVelocity(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeMetrics = await this.calculateTimeMetrics(
      thirtyDaysAgo,
      new Date(),
    );

    return {
      avgCycleTime: timeMetrics.avgDaysLeadToJob,
      avgStageTimeBreakdown: {
        leadToOpportunity: timeMetrics.avgDaysLeadToOpportunity,
        opportunityToQuote: timeMetrics.avgDaysOpportunityToQuote,
        quoteToJob: timeMetrics.avgDaysQuoteToJob,
      },
    };
  }

  async getForecastedRevenue(months: number): Promise<any[]> {
    const forecasts = [];

    for (let i = 0; i < months; i++) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + i);
      startDate.setDate(1);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const valueMetrics = await this.calculateValueMetrics(startDate, endDate);

      forecasts.push({
        month: startDate.toISOString().substring(0, 7),
        forecastedRevenue: valueMetrics.totalJobValue,
        quoteValue: valueMetrics.totalQuoteValue,
      });
    }

    return forecasts;
  }

  // Sales rep performance
  async getSalesRepPerformance(
    salesRepId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const events = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        performedBy: salesRepId,
      })
      .exec();

    const quotes = events.filter(
      (e) => e.eventType === ConversionEventType.QUOTE_SENT,
    ).length;
    const jobs = events.filter(
      (e) => e.eventType === ConversionEventType.JOB_CREATED,
    ).length;
    const revenue = events
      .filter((e) => e.eventType === ConversionEventType.JOB_CREATED)
      .reduce((sum, e) => sum + (e.eventData?.jobValue || 0), 0);

    return {
      salesRepId,
      quotesCount: quotes,
      jobsCount: jobs,
      winRate: quotes > 0 ? parseFloat(((jobs / quotes) * 100).toFixed(1)) : 0,
      totalRevenue: revenue,
    };
  }

  async getTopPerformers(
    startDate: Date,
    endDate: Date,
    limit = 10,
  ): Promise<any[]> {
    // Group events by performedBy
    const events = await this.conversionEventModel
      .find({
        eventDate: { $gte: startDate, $lte: endDate },
        performedBy: { $exists: true, $ne: null },
      })
      .exec();

    const performanceMap = new Map<string, any>();

    events.forEach((event) => {
      const repId = event.performedBy;
      if (!repId) return;

      if (!performanceMap.has(repId)) {
        performanceMap.set(repId, {
          userId: repId,
          name: repId, // TODO: Get actual name from user service
          quotes: 0,
          jobs: 0,
          revenue: 0,
        });
      }

      const perf = performanceMap.get(repId);

      if (event.eventType === ConversionEventType.QUOTE_SENT) {
        perf.quotes++;
      } else if (event.eventType === ConversionEventType.JOB_CREATED) {
        perf.jobs++;
        perf.revenue += event.eventData?.jobValue || 0;
      }

      performanceMap.set(repId, perf);
    });

    const performers = Array.from(performanceMap.values())
      .map((p) => ({
        ...p,
        winRate:
          p.quotes > 0 ? parseFloat(((p.jobs / p.quotes) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return performers;
  }
}
