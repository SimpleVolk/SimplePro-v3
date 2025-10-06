import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadActivitiesService } from '../lead-activities/lead-activities.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';

@Injectable()
export class FollowUpSchedulerService {
  private readonly logger = new Logger(FollowUpSchedulerService.name);

  constructor(
    private activitiesService: LeadActivitiesService,
    private opportunitiesService: OpportunitiesService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check for overdue follow-ups every hour
   * Sends notifications to assigned users
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueFollowUps() {
    this.logger.log('Running overdue follow-ups check...');

    try {
      const overdueActivities =
        await this.activitiesService.findOverdueActivities();

      if (overdueActivities.length === 0) {
        this.logger.log('No overdue activities found');
        return;
      }

      this.logger.log(`Found ${overdueActivities.length} overdue activities`);

      // Group by assigned user
      const byUser = overdueActivities.reduce(
        (acc, activity) => {
          if (!acc[activity.assignedTo]) {
            acc[activity.assignedTo] = [];
          }
          acc[activity.assignedTo].push(activity);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      // Send notifications to each user
      for (const [userId, activities] of Object.entries(byUser)) {
        this.eventEmitter.emit('notification.overdue_activities', {
          userId,
          activities,
          count: activities.length,
        });

        this.logger.log(
          `Notified user ${userId} about ${activities.length} overdue activities`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking overdue follow-ups:', error);
    }
  }

  /**
   * Check for stale opportunities (no activity in X days)
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkStaleOpportunities() {
    this.logger.log('Running stale opportunities check...');

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find opportunities that are still open but haven't been updated recently
      const opportunities = await this.opportunitiesService.findAll({
        status: 'open',
      });

      const staleOpportunities = opportunities.filter((opp) => {
        const updatedAt = opp.updatedAt || opp.createdAt;
        return new Date(updatedAt) < sevenDaysAgo;
      });

      if (staleOpportunities.length === 0) {
        this.logger.log('No stale opportunities found');
        return;
      }

      this.logger.log(`Found ${staleOpportunities.length} stale opportunities`);

      for (const opportunity of staleOpportunities) {
        // Emit event to trigger automation rules
        this.eventEmitter.emit('opportunity.stale_detected', {
          opportunity,
          daysSinceUpdate: Math.floor(
            (Date.now() -
              new Date(
                opportunity.updatedAt || opportunity.createdAt,
              ).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        });
      }
    } catch (error) {
      this.logger.error('Error checking stale opportunities:', error);
    }
  }

  /**
   * Process automation rules evaluation
   * Runs every 15 minutes to check for triggered rules
   */
  @Cron('*/15 * * * *')
  async processAutomationRules() {
    this.logger.debug('Automation rules processor running...');
    // This is handled by event-driven architecture
    // Rules are evaluated when events are emitted
  }

  /**
   * Cleanup old completed activities
   * Runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldActivities() {
    this.logger.log('Running cleanup of old activities...');

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // For now, just log - actual archiving would move to archive collection
      const oldActivities = await this.activitiesService.findAll({
        status: 'completed',
        toDate: oneYearAgo.toISOString(),
      });

      this.logger.log(
        `Found ${oldActivities.length} completed activities older than 1 year`,
      );

      // TODO: Implement archiving logic
      // Move to archive collection or delete based on retention policy
    } catch (error) {
      this.logger.error('Error cleaning up old activities:', error);
    }
  }

  /**
   * Daily summary report
   * Runs at 8 AM every day
   */
  @Cron('0 8 * * *')
  async sendDailySummary() {
    this.logger.log('Generating daily summary...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's scheduled activities
      const todaysActivities = await this.activitiesService.findAll({
        fromDate: today.toISOString(),
        toDate: tomorrow.toISOString(),
        status: 'pending',
      });

      // Get overdue activities
      const overdueActivities =
        await this.activitiesService.findOverdueActivities();

      // Emit event for daily summary
      this.eventEmitter.emit('notification.daily_summary', {
        date: today,
        scheduledCount: todaysActivities.length,
        overdueCount: overdueActivities.length,
        activities: todaysActivities,
      });

      this.logger.log(
        `Daily summary: ${todaysActivities.length} scheduled, ${overdueActivities.length} overdue`,
      );
    } catch (error) {
      this.logger.error('Error generating daily summary:', error);
    }
  }

  /**
   * Check for pending follow-ups in the next hour
   * Runs every 30 minutes
   */
  @Cron('*/30 * * * *')
  async checkUpcomingFollowUps() {
    this.logger.debug('Checking upcoming follow-ups...');

    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const pendingActivities =
        await this.activitiesService.findPendingFollowUps();

      const upcomingActivities = pendingActivities.filter((activity) => {
        if (!activity.dueDate) return false;
        const dueDate = new Date(activity.dueDate);
        return dueDate >= now && dueDate <= oneHourLater;
      });

      if (upcomingActivities.length > 0) {
        this.logger.log(
          `${upcomingActivities.length} activities due in the next hour`,
        );

        // Group by user and send reminders
        const byUser = upcomingActivities.reduce(
          (acc, activity) => {
            if (!acc[activity.assignedTo]) {
              acc[activity.assignedTo] = [];
            }
            acc[activity.assignedTo].push(activity);
            return acc;
          },
          {} as Record<string, any[]>,
        );

        for (const [userId, activities] of Object.entries(byUser)) {
          this.eventEmitter.emit('notification.upcoming_activities', {
            userId,
            activities,
            count: activities.length,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error checking upcoming follow-ups:', error);
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  async triggerOverdueCheck() {
    this.logger.log('Manual trigger: Overdue check');
    await this.checkOverdueFollowUps();
  }

  async triggerStaleCheck() {
    this.logger.log('Manual trigger: Stale opportunities check');
    await this.checkStaleOpportunities();
  }
}
