import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
import { LeadActivitiesModule } from '../lead-activities/lead-activities.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LeadActivitiesModule,
    OpportunitiesModule,
  ],
  providers: [FollowUpSchedulerService],
  exports: [FollowUpSchedulerService],
})
export class FollowUpSchedulerModule {}
