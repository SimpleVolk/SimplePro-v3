import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUpRulesController } from './follow-up-rules.controller';
import { FollowUpRulesService } from './follow-up-rules.service';
import {
  FollowUpRule,
  FollowUpRuleSchema,
} from './schemas/follow-up-rule.schema';
import { LeadActivitiesModule } from '../lead-activities/lead-activities.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowUpRule.name, schema: FollowUpRuleSchema },
    ]),
    LeadActivitiesModule,
  ],
  controllers: [FollowUpRulesController],
  providers: [FollowUpRulesService],
  exports: [FollowUpRulesService],
})
export class FollowUpRulesModule {}
