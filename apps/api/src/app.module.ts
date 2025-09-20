import { Module } from '@nestjs/common';

// Controllers
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

// Services
import { AppService } from './app.service';

// Core modules
import { DatabaseModule } from './database/database.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { EstimatesModule } from './estimates/estimates.module';
import { CustomersModule } from './customers/customers.module';
import { JobsModule } from './jobs/jobs.module';
import { PricingRulesModule } from './pricing-rules/pricing-rules.module';

@Module({
  imports: [DatabaseModule, AuthModule, EstimatesModule, CustomersModule, JobsModule, PricingRulesModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}