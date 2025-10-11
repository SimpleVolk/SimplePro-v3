import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CrewScheduleController } from './crew-schedule.controller';
import {
  CrewScheduleService,
  TimeOffService,
  AutoAssignmentService,
  WorkloadService,
} from './services';
import { WorkloadCronService } from './cron/workload-cron.service';
import {
  CrewAvailability,
  CrewAvailabilitySchema,
} from './schemas/crew-availability.schema';
import {
  TimeOffRequest,
  TimeOffRequestSchema,
} from './schemas/time-off-request.schema';
import {
  CrewAssignment,
  CrewAssignmentSchema,
} from './schemas/crew-assignment.schema';
import {
  CrewWorkload,
  CrewWorkloadSchema,
} from './schemas/crew-workload.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { JobsModule } from '../jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrewAvailability.name, schema: CrewAvailabilitySchema },
      { name: TimeOffRequest.name, schema: TimeOffRequestSchema },
      { name: CrewAssignment.name, schema: CrewAssignmentSchema },
      { name: CrewWorkload.name, schema: CrewWorkloadSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => JobsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [CrewScheduleController],
  providers: [
    CrewScheduleService,
    TimeOffService,
    AutoAssignmentService,
    WorkloadService,
    WorkloadCronService,
  ],
  exports: [
    CrewScheduleService,
    AutoAssignmentService,
    TimeOffService,
    WorkloadService,
  ],
})
export class CrewScheduleModule {}
