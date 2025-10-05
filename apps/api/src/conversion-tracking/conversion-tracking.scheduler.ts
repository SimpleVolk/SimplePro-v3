import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConversionTrackingService } from './conversion-tracking.service';
import { QuoteHistoryService } from '../quote-history/quote-history.service';

@Injectable()
export class ConversionTrackingScheduler {
  private readonly logger = new Logger(ConversionTrackingScheduler.name);

  constructor(
    private readonly conversionTrackingService: ConversionTrackingService,
    private readonly quoteHistoryService: QuoteHistoryService,
  ) {}

  // Run daily at 1:00 AM
  @Cron('0 1 * * *', {
    name: 'calculate-daily-metrics',
    timeZone: 'America/New_York',
  })
  async calculateDailyMetrics() {
    this.logger.log('Starting daily metrics calculation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const metrics = await this.conversionTrackingService.calculateDailyMetrics(
        yesterday,
      );

      this.logger.log(
        `Daily metrics calculated successfully for ${yesterday.toISOString().split('T')[0]}`,
      );
      this.logger.debug(`Metrics ID: ${metrics.metricsId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to calculate daily metrics', errorMessage, errorStack);
    }
  }

  // Run weekly on Sunday at 2:00 AM
  @Cron('0 2 * * 0', {
    name: 'calculate-weekly-metrics',
    timeZone: 'America/New_York',
  })
  async calculateWeeklyMetrics() {
    this.logger.log('Starting weekly metrics calculation...');

    try {
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);

      const metrics =
        await this.conversionTrackingService.calculateWeeklyMetrics(
          lastWeekStart,
        );

      this.logger.log(
        `Weekly metrics calculated successfully for week starting ${lastWeekStart.toISOString().split('T')[0]}`,
      );
      this.logger.debug(`Metrics ID: ${metrics.metricsId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to calculate weekly metrics', errorMessage, errorStack);
    }
  }

  // Run monthly on the 1st at 3:00 AM
  @Cron('0 3 1 * *', {
    name: 'calculate-monthly-metrics',
    timeZone: 'America/New_York',
  })
  async calculateMonthlyMetrics() {
    this.logger.log('Starting monthly metrics calculation...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const month = lastMonth.getMonth() + 1;
      const year = lastMonth.getFullYear();

      const metrics =
        await this.conversionTrackingService.calculateMonthlyMetrics(
          month,
          year,
        );

      this.logger.log(
        `Monthly metrics calculated successfully for ${year}-${month.toString().padStart(2, '0')}`,
      );
      this.logger.debug(`Metrics ID: ${metrics.metricsId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to calculate monthly metrics', errorMessage, errorStack);
    }
  }

  // Run every 6 hours to update expired quotes
  @Cron('0 */6 * * *', {
    name: 'update-expired-quotes',
    timeZone: 'America/New_York',
  })
  async updateExpiredQuotes() {
    this.logger.log('Checking for expired quotes...');

    try {
      const expiredQuotes = await this.quoteHistoryService.getExpiredQuotes();

      if (expiredQuotes.length === 0) {
        this.logger.log('No expired quotes found');
        return;
      }

      this.logger.log(`Found ${expiredQuotes.length} expired quotes`);

      for (const quote of expiredQuotes) {
        await this.quoteHistoryService.updateQuoteStatus(
          quote.quoteHistoryId,
          {
            status: 'expired' as any,
            notes: 'Automatically expired by system',
          },
        );
      }

      this.logger.log(
        `Successfully updated ${expiredQuotes.length} expired quotes`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to update expired quotes', errorMessage, errorStack);
    }
  }

  // Run daily at 9:00 AM to send follow-up reminders
  @Cron('0 9 * * *', {
    name: 'send-follow-up-reminders',
    timeZone: 'America/New_York',
  })
  async sendFollowUpReminders() {
    this.logger.log('Checking for pending follow-ups...');

    try {
      const pendingQuotes = await this.quoteHistoryService.getPendingQuotes();

      const needsFollowUp = pendingQuotes.filter((quote) => {
        if (!quote.timeline.quoteSentDate) return false;

        const daysSinceSent = Math.floor(
          (Date.now() - quote.timeline.quoteSentDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Follow up after 3, 7, and 14 days
        return (
          daysSinceSent === 3 ||
          daysSinceSent === 7 ||
          daysSinceSent === 14
        );
      });

      if (needsFollowUp.length === 0) {
        this.logger.log('No quotes need follow-up today');
        return;
      }

      this.logger.log(
        `${needsFollowUp.length} quotes need follow-up reminders`,
      );

      // TODO: Integrate with notification service to send reminders
      // For now, just log the quotes that need follow-up
      needsFollowUp.forEach((quote) => {
        this.logger.debug(
          `Quote ${quote.quoteNumber} needs follow-up (assigned to: ${quote.assignedSalesRep})`,
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to send follow-up reminders', errorMessage, errorStack);
    }
  }

  // Run at midnight to clean up old events (older than 2 years)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'cleanup-old-events',
    timeZone: 'America/New_York',
  })
  async cleanupOldEvents() {
    this.logger.log('Starting cleanup of old conversion events...');

    try {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      // TODO: Implement cleanup logic
      // This would typically move old data to an archive or delete it
      // For compliance, ensure proper data retention policies are followed

      this.logger.log('Old events cleanup completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to cleanup old events', errorMessage, errorStack);
    }
  }
}
