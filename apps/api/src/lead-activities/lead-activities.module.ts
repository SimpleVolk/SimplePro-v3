import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadActivitiesController } from './lead-activities.controller';
import { LeadActivitiesService } from './lead-activities.service';
import {
  LeadActivity,
  LeadActivitySchema,
} from './schemas/lead-activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeadActivity.name, schema: LeadActivitySchema },
    ]),
  ],
  controllers: [LeadActivitiesController],
  providers: [LeadActivitiesService],
  exports: [LeadActivitiesService],
})
export class LeadActivitiesModule {}
