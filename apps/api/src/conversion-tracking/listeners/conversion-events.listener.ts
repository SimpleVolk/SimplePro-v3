import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConversionTrackingService } from '../conversion-tracking.service';
import { QuoteHistoryService } from '../../quote-history/quote-history.service';
import {
  ConversionEventType,
  SourceChannel,
} from '../schemas/conversion-event.schema';

@Injectable()
export class ConversionEventsListener {
  constructor(
    private readonly conversionTrackingService: ConversionTrackingService,
    private readonly quoteHistoryService: QuoteHistoryService,
  ) {}

  @OnEvent('opportunity.created')
  async handleOpportunityCreated(payload: any) {
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.OPPORTUNITY_CREATED,
      customerId: payload.customerId,
      opportunityId: payload.opportunityId,
      eventData: {
        leadSource: payload.leadSource,
        estimatedValue: payload.estimatedValue,
      },
      performedBy: payload.createdBy,
      sourceChannel: this.mapLeadSourceToChannel(payload.leadSource),
    });

    // Track touchpoint
    if (payload.leadSource) {
      await this.conversionTrackingService.trackTouchpoint(
        payload.customerId,
        payload.leadSource,
        { source: 'opportunity_creation' },
      );
    }
  }

  @OnEvent('estimate.sent')
  async handleEstimateSent(payload: any) {
    // Track conversion event
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.QUOTE_SENT,
      customerId: payload.customerId,
      opportunityId: payload.opportunityId,
      estimateId: payload.estimateId,
      eventData: {
        quoteValue: payload.totalPrice,
        estimateDetails: payload.estimateDetails,
      },
      performedBy: payload.sentBy,
    });

    // Create quote history record
    await this.quoteHistoryService.createQuoteHistory({
      estimateId: payload.estimateId,
      opportunityId: payload.opportunityId,
      customerId: payload.customerId,
      quoteNumber: payload.quoteNumber || `QUO-${Date.now()}`,
      status: 'sent' as any,
      quoteData: {
        totalPrice: payload.totalPrice,
        breakdown: payload.breakdown,
        validUntil: payload.validUntil,
        terms: payload.terms,
        notes: payload.notes,
      },
      assignedSalesRep: payload.sentBy,
      createdBy: payload.sentBy,
    });
  }

  @OnEvent('estimate.viewed')
  async handleEstimateViewed(payload: any) {
    // Track conversion event
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.QUOTE_VIEWED,
      customerId: payload.customerId,
      opportunityId: payload.opportunityId,
      estimateId: payload.estimateId,
      eventData: {
        viewedAt: new Date(),
        viewSource: payload.source,
      },
    });

    // Update quote history with interaction
    if (payload.quoteHistoryId) {
      await this.quoteHistoryService.addCustomerInteraction(
        payload.quoteHistoryId,
        {
          type: 'viewed',
          details: {
            viewedAt: new Date(),
            source: payload.source,
          },
          userId: payload.viewedBy,
        },
      );
    }
  }

  @OnEvent('job.created')
  async handleJobCreated(payload: any) {
    // Track job creation event
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.JOB_CREATED,
      customerId: payload.customerId,
      opportunityId: payload.opportunityId,
      estimateId: payload.estimateId,
      jobId: payload.jobId,
      eventData: {
        jobValue: payload.totalCost,
        jobType: payload.jobType,
        scheduledDate: payload.scheduledDate,
      },
      performedBy: payload.createdBy,
    });

    // Mark quote as won if estimate exists
    if (payload.estimateId) {
      try {
        const quoteHistory = await this.quoteHistoryService.getByEstimateId(
          payload.estimateId,
        );

        await this.quoteHistoryService.markAsWon(quoteHistory.quoteHistoryId, {
          winReason: 'converted_to_job',
          winReasonDetails: 'Customer accepted quote and job was created',
          keySellingPoints: payload.keyFactors || [],
          marginAchieved: this.calculateMargin(payload),
        });

        // Track quote accepted event
        await this.conversionTrackingService.trackEvent({
          eventType: ConversionEventType.QUOTE_ACCEPTED,
          customerId: payload.customerId,
          opportunityId: payload.opportunityId,
          estimateId: payload.estimateId,
          jobId: payload.jobId,
          eventData: {
            acceptedValue: payload.totalCost,
          },
          performedBy: payload.createdBy,
        });
      } catch (error) {
        console.error('Error marking quote as won:', error);
      }
    }
  }

  @OnEvent('job.completed')
  async handleJobCompleted(payload: any) {
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.JOB_COMPLETED,
      customerId: payload.customerId,
      jobId: payload.jobId,
      eventData: {
        completedDate: payload.completedDate,
        finalCost: payload.finalCost,
        customerSatisfaction: payload.rating,
      },
      performedBy: payload.completedBy,
    });
  }

  @OnEvent('payment.received')
  async handlePaymentReceived(payload: any) {
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.PAYMENT_RECEIVED,
      customerId: payload.customerId,
      jobId: payload.jobId,
      eventData: {
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        receivedDate: payload.receivedDate,
      },
    });
  }

  @OnEvent('quote.rejected')
  async handleQuoteRejected(payload: any) {
    // Track quote rejection event
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.QUOTE_REJECTED,
      customerId: payload.customerId,
      opportunityId: payload.opportunityId,
      estimateId: payload.estimateId,
      eventData: {
        rejectedReason: payload.reason,
        competitorChosen: payload.competitorChosen,
      },
    });

    // Mark quote as lost
    if (payload.quoteHistoryId) {
      await this.quoteHistoryService.markAsLost(payload.quoteHistoryId, {
        lostReason: payload.reason,
        lostReasonDetails: payload.details,
        competitorWon: payload.competitorChosen,
        priceDifference: payload.priceDifference,
        lessonsLearned: payload.lessonsLearned,
        followUpScheduled: payload.followUpDate,
      });
    }
  }

  @OnEvent('sales.follow_up')
  async handleSalesFollowUp(payload: any) {
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.FOLLOW_UP_COMPLETED,
      customerId: payload.customerId,
      opportunityId: payload.opportunityId,
      estimateId: payload.estimateId,
      eventData: {
        followUpType: payload.type,
        outcome: payload.outcome,
        notes: payload.notes,
      },
      performedBy: payload.performedBy,
    });

    // Add to quote history if applicable
    if (payload.quoteHistoryId) {
      await this.quoteHistoryService.addSalesActivity(payload.quoteHistoryId, {
        activityType: payload.type,
        performedBy: payload.performedBy,
        outcome: payload.outcome,
        notes: payload.notes,
      });
    }
  }

  @OnEvent('lead.created')
  async handleLeadCreated(payload: any) {
    await this.conversionTrackingService.trackEvent({
      eventType: ConversionEventType.LEAD_CREATED,
      customerId: payload.customerId,
      eventData: {
        leadSource: payload.source,
        leadQuality: payload.quality,
      },
      sourceChannel: this.mapLeadSourceToChannel(payload.source),
    });

    // Track first touchpoint
    if (payload.source) {
      await this.conversionTrackingService.trackTouchpoint(
        payload.customerId,
        payload.source,
        { source: 'lead_creation' },
      );
    }
  }

  // Helper methods
  private mapLeadSourceToChannel(leadSource: string): SourceChannel {
    const sourceMap: Record<string, SourceChannel> = {
      website: SourceChannel.WEBSITE,
      phone: SourceChannel.PHONE,
      referral: SourceChannel.REFERRAL,
      partner: SourceChannel.PARTNER,
      repeat: SourceChannel.REPEAT_CUSTOMER,
      'social media': SourceChannel.SOCIAL_MEDIA,
      email: SourceChannel.EMAIL,
      'walk-in': SourceChannel.WALK_IN,
    };

    return sourceMap[leadSource?.toLowerCase()] || SourceChannel.WEBSITE;
  }

  private calculateMargin(payload: any): number {
    if (!payload.totalCost || !payload.estimatedCost) {
      return 0;
    }

    const margin =
      ((payload.totalCost - payload.estimatedCost) / payload.totalCost) * 100;
    return parseFloat(margin.toFixed(2));
  }
}
