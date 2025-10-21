import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job, JobSchema } from './schemas/job.schema';
import { WebSocketModule } from '../websocket/websocket.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GraphQLModule } from '../graphql/graphql.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    forwardRef(() => WebSocketModule),
    forwardRef(() => GraphQLModule),
    AuditLogsModule,
    InventoryModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
