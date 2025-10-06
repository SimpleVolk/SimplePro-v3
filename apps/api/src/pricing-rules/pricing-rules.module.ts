import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PricingRulesController } from './pricing-rules.controller';
import { PricingRulesService } from './pricing-rules.service';
import { PricingRule, PricingRuleSchema } from './schemas/pricing-rule.schema';
import { RuleHistory, RuleHistorySchema } from './schemas/rule-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PricingRule.name, schema: PricingRuleSchema },
      { name: RuleHistory.name, schema: RuleHistorySchema },
    ]),
  ],
  controllers: [PricingRulesController],
  providers: [PricingRulesService],
  exports: [PricingRulesService],
})
export class PricingRulesModule {}
