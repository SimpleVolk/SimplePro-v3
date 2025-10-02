# Quote History & Conversion Tracking Analytics System

## Overview

The Quote History & Conversion Tracking system provides comprehensive analytics for the complete sales lifecycle in SimplePro-v3. This production-ready implementation tracks quotes from creation to conversion, providing detailed metrics, win/loss analysis, and sales performance insights.

## Architecture

### Backend Infrastructure

#### 1. Quote History Module (`apps/api/src/quote-history/`)

**Purpose**: Track complete quote lifecycle with detailed interaction history.

**Key Features**:
- Multi-version quote tracking
- Customer interaction logging (viewed, downloaded, questioned)
- Sales activity tracking (calls, emails, meetings)
- Win/loss analysis with reasons
- Competitor information tracking
- Timeline metrics (days to decision, days to first view)

**Schema** (`schemas/quote-history.schema.ts`):
```typescript
QuoteHistory {
  quoteHistoryId: string (unique)
  estimateId: string (unique)
  opportunityId: string (indexed)
  customerId: string (indexed)
  version: number
  quoteNumber: string
  status: QuoteStatus (draft/sent/viewed/accepted/rejected/expired/revised)

  quoteData: {
    totalPrice: number
    breakdown: object
    validUntil: Date
    terms: string
    notes: string
  }

  customerInteractions: [{
    type: InteractionType
    timestamp: Date
    details: object
    userId: string
  }]

  salesActivity: [{
    activityType: SalesActivityType
    timestamp: Date
    performedBy: string
    outcome: string
    notes: string
  }]

  timeline: {
    quoteSentDate: Date
    firstViewedDate: Date
    lastViewedDate: Date
    decisionDate: Date
    daysToDecision: number
    daysToFirstView: number
    totalViewCount: number
    followUpDates: Date[]
  }

  winAnalysis?: {
    winReason: WinReason
    winReasonDetails: string
    keySellingPoints: string[]
    marginAchieved: number
    upsellOpportunities: string[]
  }

  lossAnalysis?: {
    lostReason: LossReason
    lostReasonDetails: string
    competitorWon: string
    priceDifference: number
    lessonsLearned: string
    followUpScheduled: Date
  }

  competitorInfo?: {
    hasCompetingQuotes: boolean
    competitorNames: string[]
    ourPriceVsCompetitor: number
    competitiveAdvantages: string[]
    competitiveDisadvantages: string[]
  }

  revisionHistory: [{
    revisionNumber: number
    revisedDate: Date
    revisedBy: string
    priceChange: number
    changeReason: string
    changesDescription: string
  }]

  assignedSalesRep: string
  createdBy: string
}
```

**Indexes**:
- Primary: `quoteHistoryId`, `estimateId`
- Single: `opportunityId`, `customerId`, `status`, `assignedSalesRep`
- Compound: `(customerId, createdAt)`, `(assignedSalesRep, status)`, `(status, timeline.daysToDecision)`, `(timeline.quoteSentDate)`

**API Endpoints**:
```
POST   /api/quote-history                                    - Create quote version
GET    /api/quote-history/:id                                - Get quote details
GET    /api/quote-history/customer/:customerId               - Customer quote history
GET    /api/quote-history/opportunity/:opportunityId         - Opportunity quotes
GET    /api/quote-history/sales-rep/:salesRepId              - Sales rep quotes
GET    /api/quote-history/pending                            - Pending quotes
GET    /api/quote-history/expired                            - Expired quotes
PATCH  /api/quote-history/:id/status                         - Update status
POST   /api/quote-history/:id/interaction                    - Add customer interaction
POST   /api/quote-history/:id/activity                       - Add sales activity
POST   /api/quote-history/:id/revision                       - Create revision
POST   /api/quote-history/:id/mark-won                       - Mark quote as won
POST   /api/quote-history/:id/mark-lost                      - Mark quote as lost
GET    /api/quote-history/analytics/win-loss-reasons         - Win/loss analysis
GET    /api/quote-history/analytics/conversion-by-price      - Price range conversion
GET    /api/quote-history/analytics/avg-days-to-decision     - Average decision time
```

#### 2. Conversion Tracking Module (`apps/api/src/conversion-tracking/`)

**Purpose**: Track complete sales funnel with multi-touch attribution.

**Key Features**:
- Event-driven conversion tracking
- Multi-touch attribution (first-touch, last-touch)
- Funnel stage analysis
- Pipeline velocity metrics
- Revenue forecasting
- Sales rep performance tracking
- Automated daily/weekly/monthly metrics calculation

**Schemas**:

**ConversionEvent** (`schemas/conversion-event.schema.ts`):
```typescript
ConversionEvent {
  eventId: string (unique)
  customerId: string (indexed)
  opportunityId: string (indexed)
  estimateId: string (indexed)
  jobId: string (indexed)

  eventType: ConversionEventType (indexed)
  // LEAD_CREATED, OPPORTUNITY_CREATED, QUOTE_SENT, QUOTE_VIEWED,
  // FOLLOW_UP_COMPLETED, QUOTE_ACCEPTED, QUOTE_REJECTED,
  // JOB_CREATED, JOB_COMPLETED, PAYMENT_RECEIVED

  eventDate: Date (indexed)
  eventData: object
  performedBy: string

  sourceChannel: SourceChannel (indexed)
  // WEBSITE, PHONE, REFERRAL, PARTNER, REPEAT_CUSTOMER,
  // SOCIAL_MEDIA, EMAIL, WALK_IN

  attribution: {
    firstTouchChannel: string
    lastTouchChannel: string
    touchpoints: [{
      channel: string
      date: Date
      metadata: object
    }]
  }
}
```

**ConversionMetrics** (`schemas/conversion-metrics.schema.ts`):
```typescript
ConversionMetrics {
  metricsId: string (unique)

  period: {
    startDate: Date
    endDate: Date
  }

  granularity: MetricsGranularity (daily/weekly/monthly/quarterly)

  metrics: {
    funnelMetrics: {
      totalLeads: number
      qualifiedOpportunities: number
      quotesSent: number
      quotesAccepted: number
      jobsCreated: number
      jobsCompleted: number
    }

    conversionRates: {
      leadToOpportunityRate: number
      opportunityToQuoteRate: number
      quoteToJobRate: number
      overallConversionRate: number
    }

    timeMetrics: {
      avgDaysLeadToOpportunity: number
      avgDaysOpportunityToQuote: number
      avgDaysQuoteToJob: number
      avgDaysLeadToJob: number
    }

    valueMetrics: {
      totalQuoteValue: number
      totalJobValue: number
      avgQuoteValue: number
      avgJobValue: number
      quoteToJobValueRatio: number
    }

    winLossAnalysis: {
      quotesWon: number
      quotesLost: number
      winRate: number
      lossReasons: {
        reasonCounts: object
        reasonPercentages: object
      }
    }

    salesPerformance: {
      avgQuotesPerSalesRep: number
      avgWinRatePerSalesRep: number
      topPerformers: [{
        userId: string
        name: string
        winRate: number
        totalRevenue: number
        quotesCount: number
        jobsCount: number
      }]
    }
  }

  calculatedAt: Date
}
```

**API Endpoints**:
```
POST   /api/conversion-tracking/track-event                  - Manual event tracking
GET    /api/conversion-tracking/funnel                       - Conversion funnel data
GET    /api/conversion-tracking/rates                        - Conversion rates
GET    /api/conversion-tracking/attribution                  - Attribution analysis
GET    /api/conversion-tracking/metrics/daily                - Daily metrics
GET    /api/conversion-tracking/metrics/monthly              - Monthly metrics
GET    /api/conversion-tracking/pipeline-velocity            - Pipeline velocity
GET    /api/conversion-tracking/revenue-forecast             - Revenue forecast
GET    /api/conversion-tracking/sales-rep/:id/performance    - Sales rep metrics
GET    /api/conversion-tracking/leaderboard                  - Top performers
GET    /api/conversion-tracking/dashboard                    - Combined dashboard
```

#### 3. Event Listeners (`conversion-tracking/listeners/conversion-events.listener.ts`)

**Automatic Event Tracking**: The system automatically tracks conversion events through event listeners.

**Supported Events**:
- `opportunity.created` → Tracks `OPPORTUNITY_CREATED`
- `estimate.sent` → Tracks `QUOTE_SENT` + creates QuoteHistory record
- `estimate.viewed` → Tracks `QUOTE_VIEWED` + updates QuoteHistory
- `job.created` → Tracks `JOB_CREATED` + `QUOTE_ACCEPTED` + marks quote as won
- `job.completed` → Tracks `JOB_COMPLETED`
- `payment.received` → Tracks `PAYMENT_RECEIVED`
- `quote.rejected` → Tracks `QUOTE_REJECTED` + marks quote as lost
- `sales.follow_up` → Tracks `FOLLOW_UP_COMPLETED` + adds sales activity
- `lead.created` → Tracks `LEAD_CREATED` + first touchpoint

**Integration Example**:
```typescript
// In your jobs service/controller
import { EventEmitter2 } from '@nestjs/event-emitter';

constructor(private eventEmitter: EventEmitter2) {}

async createJob(dto: CreateJobDto) {
  const job = await this.jobsModel.create(dto);

  // Emit event to trigger conversion tracking
  this.eventEmitter.emit('job.created', {
    customerId: job.customerId,
    opportunityId: job.opportunityId,
    estimateId: job.estimateId,
    jobId: job.jobId,
    totalCost: job.totalCost,
    jobType: job.jobType,
    scheduledDate: job.scheduledDate,
    createdBy: job.createdBy,
  });

  return job;
}
```

#### 4. Automated Metrics Calculation (`conversion-tracking.scheduler.ts`)

**Cron Jobs**:
- **Daily Metrics** (1:00 AM): Calculate previous day's conversion metrics
- **Weekly Metrics** (2:00 AM Sunday): Calculate previous week's metrics
- **Monthly Metrics** (3:00 AM 1st): Calculate previous month's metrics
- **Expired Quotes** (Every 6 hours): Automatically mark expired quotes
- **Follow-up Reminders** (9:00 AM): Check for quotes needing follow-up
- **Cleanup** (Midnight): Archive old events (2+ years)

### Frontend Components

#### 1. ConversionFunnel Component

**File**: `apps/web/src/app/components/conversion/ConversionFunnel.tsx`

**Features**:
- Visual funnel showing: Leads → Opportunities → Quotes Sent → Quotes Accepted → Jobs Created
- Conversion rates between each stage
- Total values at each stage
- Overall conversion summary

**Props**:
```typescript
{
  startDate?: string;  // ISO date string
  endDate?: string;    // ISO date string
}
```

**Usage**:
```tsx
import { ConversionFunnel } from '@/components/conversion';

<ConversionFunnel startDate="2024-01-01" endDate="2024-01-31" />
```

#### 2. WinLossAnalysis Component

**File**: `apps/web/src/app/components/conversion/WinLossAnalysis.tsx`

**Features**:
- Win/loss ratio summary cards
- Pie charts showing win reasons and loss reasons
- Detailed breakdown with counts and percentages
- Recharts integration for interactive visualizations

**Props**:
```typescript
{
  startDate?: string;
  endDate?: string;
}
```

**Usage**:
```tsx
import { WinLossAnalysis } from '@/components/conversion';

<WinLossAnalysis startDate="2024-01-01" endDate="2024-01-31" />
```

#### 3. SalesPerformance Component

**File**: `apps/web/src/app/components/conversion/SalesPerformance.tsx`

**Features**:
- Leaderboard with medal rankings
- Revenue bar chart by sales rep
- Performance metrics (quotes, jobs, win rate, revenue)
- Progress bars for win rates
- Summary metrics (total revenue, quotes, jobs, avg win rate)

**Props**:
```typescript
{
  startDate?: string;
  endDate?: string;
  limit?: number;  // Default: 10
}
```

**Usage**:
```tsx
import { SalesPerformance } from '@/components/conversion';

<SalesPerformance startDate="2024-01-01" endDate="2024-01-31" limit={10} />
```

#### 4. QuoteHistoryDetail Component

**File**: `apps/web/src/app/components/conversion/QuoteHistoryDetail.tsx`

**Features**:
- Complete quote information display
- Status badges and version tracking
- Timeline visualization
- Win/loss analysis details
- Customer interaction history
- Sales activity log
- Competitor information

**Props**:
```typescript
{
  quoteHistoryId: string;
  onClose?: () => void;
}
```

**Usage**:
```tsx
import { QuoteHistoryDetail } from '@/components/conversion';

<QuoteHistoryDetail
  quoteHistoryId="quote-history-uuid"
  onClose={() => setShowDetail(false)}
/>
```

#### 5. QuoteTimeline Component (NEW)

**File**: `apps/web/src/app/components/conversion/QuoteTimeline.tsx`

**Features**:
- Chronological timeline of all quote events
- Interactive event cards with icons
- Customer engagement heatmap (last 30 days)
- Relative timestamps (e.g., "2 days ago")
- Filterable by opportunity

**Props**:
```typescript
{
  opportunityId: string;
}
```

**Usage**:
```tsx
import { QuoteTimeline } from '@/components/conversion';

<QuoteTimeline opportunityId="opportunity-uuid" />
```

## Integration Guide

### Step 1: Emit Events from Your Business Logic

In your services/controllers, emit events when key actions occur:

```typescript
// Example: Opportunities Service
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OpportunitiesService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createOpportunity(dto: CreateOpportunityDto) {
    const opportunity = await this.opportunitiesModel.create(dto);

    // Emit event for conversion tracking
    this.eventEmitter.emit('opportunity.created', {
      opportunityId: opportunity.opportunityId,
      customerId: opportunity.customerId,
      leadSource: opportunity.leadSource,
      estimatedValue: opportunity.estimatedValue,
      createdBy: opportunity.createdBy,
    });

    return opportunity;
  }
}
```

### Step 2: Track Quote Views

When a customer views a quote (e.g., via email link):

```typescript
// In your estimates controller
@Get('view/:estimateId')
async viewEstimate(@Param('estimateId') estimateId: string) {
  const estimate = await this.estimatesService.findById(estimateId);

  // Track view event
  this.eventEmitter.emit('estimate.viewed', {
    customerId: estimate.customerId,
    opportunityId: estimate.opportunityId,
    estimateId: estimate.estimateId,
    source: 'email_link',
    viewedBy: 'customer',
  });

  return estimate;
}
```

### Step 3: Send Quotes

When sending a quote to a customer:

```typescript
@Post('send/:estimateId')
async sendEstimate(
  @Param('estimateId') estimateId: string,
  @Body() dto: SendEstimateDto,
  @Request() req
) {
  const estimate = await this.estimatesService.findById(estimateId);

  // Send email, SMS, etc.
  await this.notificationService.sendEstimate(estimate, dto.recipient);

  // Track quote sent event
  this.eventEmitter.emit('estimate.sent', {
    estimateId: estimate.estimateId,
    opportunityId: estimate.opportunityId,
    customerId: estimate.customerId,
    quoteNumber: `QUO-${Date.now()}`,
    totalPrice: estimate.totalPrice,
    breakdown: estimate.breakdown,
    validUntil: dto.validUntil,
    terms: dto.terms,
    notes: dto.notes,
    sentBy: req.user.userId,
  });

  return { success: true };
}
```

### Step 4: Handle Quote Rejection

When a customer or sales rep marks a quote as lost:

```typescript
@Post('reject/:estimateId')
async rejectEstimate(
  @Param('estimateId') estimateId: string,
  @Body() dto: RejectEstimateDto
) {
  const quoteHistory = await this.quoteHistoryService.getByEstimateId(estimateId);

  // Track rejection
  this.eventEmitter.emit('quote.rejected', {
    customerId: quoteHistory.customerId,
    opportunityId: quoteHistory.opportunityId,
    estimateId: estimateId,
    quoteHistoryId: quoteHistory.quoteHistoryId,
    reason: dto.reason,
    details: dto.details,
    competitorChosen: dto.competitorChosen,
    priceDifference: dto.priceDifference,
    lessonsLearned: dto.lessonsLearned,
    followUpDate: dto.followUpDate,
  });

  return { success: true };
}
```

### Step 5: Display Analytics in Your UI

Create a comprehensive analytics dashboard:

```tsx
'use client';

import { useState } from 'react';
import {
  ConversionFunnel,
  WinLossAnalysis,
  SalesPerformance,
  QuoteTimeline
} from '@/components/conversion';

export default function ConversionAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  return (
    <div className="dashboard">
      <h1>Conversion Analytics</h1>

      {/* Date Range Selector */}
      <div className="date-selector">
        <input
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
        />
        <input
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
        />
      </div>

      {/* Conversion Funnel */}
      <section>
        <ConversionFunnel {...dateRange} />
      </section>

      {/* Win/Loss Analysis */}
      <section>
        <WinLossAnalysis {...dateRange} />
      </section>

      {/* Sales Performance */}
      <section>
        <SalesPerformance {...dateRange} limit={10} />
      </section>
    </div>
  );
}
```

## Data Flow

```
1. Business Event Occurs (e.g., Job Created)
   ↓
2. Service/Controller Emits Event (EventEmitter2)
   ↓
3. ConversionEventsListener Receives Event
   ↓
4. Listener Calls ConversionTrackingService.trackEvent()
   ↓
5. Event Saved to ConversionEvent Collection
   ↓
6. If Quote-Related: Update QuoteHistory
   ↓
7. Cron Jobs Calculate Aggregated Metrics
   ↓
8. Metrics Saved to ConversionMetrics Collection
   ↓
9. Frontend Components Fetch via API
   ↓
10. Analytics Displayed to Users
```

## Performance Considerations

### Database Optimization

1. **Compound Indexes**: All queries are optimized with compound indexes
   - `(customerId, eventDate)` for customer timeline queries
   - `(opportunityId, eventType)` for funnel analysis
   - `(eventType, eventDate)` for metrics calculation

2. **Aggregation Pipeline**: Use MongoDB aggregation for complex analytics
   - Pre-calculate daily/weekly/monthly metrics via cron
   - Store in ConversionMetrics for fast retrieval

3. **TTL Indexes**: Automatic cleanup of old events (2+ years)

### Caching Strategy

```typescript
// Recommended: Implement Redis caching for frequently accessed metrics
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class ConversionTrackingService {
  async getConversionFunnel(startDate: Date, endDate: Date) {
    const cacheKey = `funnel:${startDate.toISOString()}:${endDate.toISOString()}`;

    // Check cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Calculate if not cached
    const funnel = await this.calculateFunnel(startDate, endDate);

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, funnel, 3600);

    return funnel;
  }
}
```

## Testing

### Backend Unit Tests

```typescript
// Example: Quote History Service Tests
describe('QuoteHistoryService', () => {
  it('should create quote history record', async () => {
    const dto = {
      estimateId: 'est-123',
      opportunityId: 'opp-456',
      customerId: 'cust-789',
      quoteNumber: 'QUO-001',
      status: QuoteStatus.SENT,
      quoteData: {
        totalPrice: 5000,
        validUntil: new Date('2024-12-31'),
      },
      assignedSalesRep: 'rep-001',
      createdBy: 'user-001',
    };

    const result = await service.createQuoteHistory(dto);

    expect(result.quoteHistoryId).toBeDefined();
    expect(result.status).toBe(QuoteStatus.SENT);
    expect(result.timeline.quoteSentDate).toBeDefined();
  });

  it('should calculate days to decision', async () => {
    const quote = await service.createQuoteHistory(dto);

    // Simulate quote acceptance after 5 days
    await service.updateQuoteStatus(quote.quoteHistoryId, {
      status: QuoteStatus.ACCEPTED,
    });

    const updated = await service.findById(quote.quoteHistoryId);
    expect(updated.timeline.daysToDecision).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Conversion Tracking Integration', () => {
  it('should track complete conversion flow', async () => {
    // Create opportunity
    await request(app)
      .post('/api/opportunities')
      .send(opportunityData);

    // Send quote
    await request(app)
      .post('/api/estimates/send/est-123')
      .send(quoteData);

    // Create job
    await request(app)
      .post('/api/jobs')
      .send(jobData);

    // Verify conversion events
    const events = await conversionTrackingService
      .getConversionFunnel(startDate, endDate);

    expect(events.funnelStages[0].count).toBe(1); // Opportunities
    expect(events.funnelStages[1].count).toBe(1); // Quotes Sent
    expect(events.funnelStages[2].count).toBe(1); // Jobs Created
  });
});
```

## Troubleshooting

### Common Issues

1. **Events Not Being Tracked**
   - Verify EventEmitterModule is imported in AppModule
   - Check that event names match exactly (case-sensitive)
   - Ensure ConversionEventsListener is registered as provider

2. **Metrics Not Calculating**
   - Check ScheduleModule is imported in ConversionTrackingModule
   - Verify cron expressions are correct
   - Check application logs for scheduler errors

3. **Frontend Components Not Loading Data**
   - Verify API endpoints are accessible (check CORS)
   - Check authentication token is valid
   - Review network tab for API errors

## Future Enhancements

1. **Machine Learning Integration**
   - Predict quote win probability
   - Recommend optimal pricing
   - Identify high-value leads

2. **Advanced Attribution**
   - Multi-touch attribution modeling
   - Channel ROI calculation
   - Marketing campaign tracking

3. **Real-time Notifications**
   - WebSocket notifications for quote views
   - Slack/Teams integration for won deals
   - SMS alerts for high-value opportunities

4. **Custom Reporting**
   - Report builder UI
   - Scheduled email reports
   - Custom metric definitions

## Support

For questions or issues:
- Review API logs: `apps/api/logs/`
- Check cron job execution: Monitor `ConversionTrackingScheduler` logs
- Database queries: Use MongoDB Compass to inspect collections

## License

Part of SimplePro-v3 - Internal Business Management System
