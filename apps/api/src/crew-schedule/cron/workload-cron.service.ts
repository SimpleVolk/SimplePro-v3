import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkloadService } from '../services/workload.service';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import { startOfWeek } from 'date-fns';

@Injectable()
export class WorkloadCronService {
  private readonly logger = new Logger(WorkloadCronService.name);

  constructor(
    private readonly workloadService: WorkloadService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Calculate daily workloads for all crew members
   * Runs every day at 1:00 AM
   */
  @Cron('0 1 * * *', {
    name: 'calculate-daily-workloads',
    timeZone: 'America/New_York',
  })
  async calculateDailyWorkloads() {
    this.logger.log('Starting daily workload calculation...');

    try {
      const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });

      // Get all crew members
      const allCrew = await this.userModel
        .find({
          role: { $in: ['crew', 'admin', 'dispatcher'] },
          isActive: true,
        })
        .lean()
        .exec();

      this.logger.log(`Found ${allCrew.length} crew members to process`);

      let successCount = 0;
      let errorCount = 0;

      for (const crew of allCrew) {
        try {
          await this.workloadService.calculateWorkload(
            crew._id.toString(),
            startOfWeekDate,
          );
          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error calculating workload for crew ${crew._id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Daily workload calculation completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to calculate daily workloads: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate workloads for the upcoming week
   * Runs every Sunday at 11:00 PM to prepare for the new week
   */
  @Cron('0 23 * * 0', {
    name: 'prepare-next-week-workloads',
    timeZone: 'America/New_York',
  })
  async prepareNextWeekWorkloads() {
    this.logger.log('Preparing workloads for next week...');

    try {
      const nextWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);

      const allCrew = await this.userModel
        .find({
          role: { $in: ['crew', 'admin', 'dispatcher'] },
          isActive: true,
        })
        .lean()
        .exec();

      this.logger.log(
        `Preparing workloads for ${allCrew.length} crew members for week starting ${nextWeekStart.toISOString()}`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const crew of allCrew) {
        try {
          await this.workloadService.calculateWorkload(
            crew._id.toString(),
            nextWeekStart,
          );
          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error preparing workload for crew ${crew._id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Next week workload preparation completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to prepare next week workloads: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Identify and log overloaded crew members
   * Runs every day at 8:00 AM to alert dispatchers
   */
  @Cron('0 8 * * *', {
    name: 'check-overloaded-crew',
    timeZone: 'America/New_York',
  })
  async checkOverloadedCrew() {
    this.logger.log('Checking for overloaded crew members...');

    try {
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const overloadedCrew =
        await this.workloadService.getOverloadedCrew(currentWeekStart);

      if (overloadedCrew.length > 0) {
        this.logger.warn(
          `Found ${overloadedCrew.length} overloaded crew members:`,
        );
        overloadedCrew.forEach((crew) => {
          this.logger.warn(
            `- ${crew.name} (${crew.email}): ${crew.workload.totalJobs} jobs, ${crew.workload.hoursWorked} hours`,
          );
        });

        // TODO: Send notification to dispatchers/admins
        // This can be implemented with email service or push notifications
      } else {
        this.logger.log('No overloaded crew members found');
      }
    } catch (error) {
      this.logger.error(
        `Failed to check overloaded crew: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weekly workload balance report
   * Runs every Monday at 9:00 AM to provide insights
   */
  @Cron('0 9 * * 1', {
    name: 'weekly-workload-report',
    timeZone: 'America/New_York',
  })
  async generateWeeklyWorkloadReport() {
    this.logger.log('Generating weekly workload balance report...');

    try {
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const balancingResult =
        await this.workloadService.balanceWorkload(currentWeekStart);

      this.logger.log(
        `Weekly Workload Report for week starting ${currentWeekStart.toISOString()}:`,
      );
      this.logger.log(`- Total crew members: ${balancingResult.totalCrewMembers}`);
      this.logger.log(`- Total jobs: ${balancingResult.totalJobs}`);
      this.logger.log(
        `- Average jobs per crew: ${balancingResult.averageJobsPerCrew}`,
      );
      this.logger.log(`- Overloaded crew: ${balancingResult.overloadedCrew}`);
      this.logger.log(
        `- Underutilized crew: ${balancingResult.underutilizedCrew}`,
      );

      // Log top 5 recommendations
      const topRecommendations = balancingResult.recommendations
        .filter((r) => r.recommendedAction !== 'Normal workload')
        .slice(0, 5);

      if (topRecommendations.length > 0) {
        this.logger.log('Top recommendations:');
        topRecommendations.forEach((rec) => {
          this.logger.log(
            `- Crew ${rec.crewMemberId}: ${rec.currentJobs} jobs - ${rec.recommendedAction}`,
          );
        });
      }

      // TODO: Send weekly report to admins/dispatchers via email
    } catch (error) {
      this.logger.error(
        `Failed to generate weekly workload report: ${error.message}`,
        error.stack,
      );
    }
  }
}
