import { Module } from '@nestjs/common';

// Controllers
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

// Services
import { AppService } from './app.service';

// Feature modules
import { EstimatesModule } from './estimates/estimates.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [EstimatesModule, CustomersModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}