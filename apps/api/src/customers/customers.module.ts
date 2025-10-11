import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import {
  Opportunity,
  OpportunitySchema,
} from '../opportunities/schemas/opportunity.schema';
import { DocumentEntity, DocumentSchema } from '../documents/schemas/document.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Job.name, schema: JobSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: DocumentEntity.name, schema: DocumentSchema },
    ]),
    AuditLogsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
