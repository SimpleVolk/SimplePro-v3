import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  UseInterceptors,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';
import {
  CreateJobDto,
  UpdateJobDto,
  JobFilters,
  CrewAssignment,
  InternalNote,
} from './interfaces/job.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/interfaces/user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JobQueryFiltersDto } from '../common/dto/query-filters.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CacheListInterceptor } from '../cache/interceptors/cache-list.interceptor';
import { CacheTTL } from '../cache/decorators/cache-ttl.decorator';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CacheListInterceptor) // PERFORMANCE: Automatic caching for GET requests
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'jobs', action: 'create' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: User,
    @Req() req: any,
  ) {
    const job = await this.jobsService.create(createJobDto, user.id);

    // Log job creation
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'CREATE_JOB',
      'Job',
      {
        resourceId: job.id,
        severity: 'info',
        outcome: 'success',
        changes: {
          after: { customerId: job.customerId, type: job.type, status: job.status },
        },
      }
    );

    return {
      success: true,
      job,
      message: 'Job created successfully',
    };
  }

  @Get()
  @CacheTTL(120) // PERFORMANCE: Cache for 2 minutes
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Query(ValidationPipe) query: JobQueryFiltersDto,
    @Query() pagination: PaginationDto,
  ) {
    // Parse query parameters into filters
    const filters: JobFilters = {
      status: query.status,
      type: query.type,
      priority: query.priority,
      customerId: query.customerId,
      assignedCrew: query.assignedCrew,
      scheduledAfter: query.scheduledAfter ? new Date(query.scheduledAfter) : undefined,
      scheduledBefore: query.scheduledBefore ? new Date(query.scheduledBefore) : undefined,
      createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
      createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
      search: query.search,
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof JobFilters] === undefined) {
        delete filters[key as keyof JobFilters];
      }
    });

    const result = await this.jobsService.findAll(
      Object.keys(filters).length > 0 ? filters : undefined,
      pagination.skip,
      pagination.limit,
    );

    return {
      success: true,
      jobs: result.data,
      count: result.data.length,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pagination: result.pagination,
    };
  }

  @Get('stats')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStats() {
    const stats = await this.jobsService.getJobStats();

    return {
      success: true,
      stats,
    };
  }

  @Get('by-date/:date')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getJobsByDate(@Param('date') dateString: string) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      };
    }

    const jobs = await this.jobsService.getJobsByDate(date);

    return {
      success: true,
      jobs,
      date: dateString,
      count: jobs.length,
    };
  }

  @Get(':id')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string) {
    const job = await this.jobsService.findOne(id);

    return {
      success: true,
      job,
    };
  }

  @Get('job-number/:jobNumber')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findByJobNumber(@Param('jobNumber') jobNumber: string) {
    const job = await this.jobsService.findByJobNumber(jobNumber);

    return {
      success: true,
      job,
      found: !!job,
    };
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser() user: User,
  ) {
    const job = await this.jobsService.update(id, updateJobDto, user.id);

    return {
      success: true,
      job,
      message: 'Job updated successfully',
    };
  }

  @Patch(':id/status')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateStatus(
    @Param('id') id: string,
    @Body() statusUpdate: { status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' },
    @CurrentUser() user: User,
    @Req() req: any,
  ) {
    // Get old job state for audit trail
    const oldJob = await this.jobsService.findOne(id);
    const job = await this.jobsService.updateStatus(id, statusUpdate.status, user.id);

    // Log status change
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'JOB_STATUS_CHANGE',
      'Job',
      {
        resourceId: id,
        severity: 'info',
        outcome: 'success',
        changes: {
          before: { status: oldJob.status },
          after: { status: statusUpdate.status },
        },
      }
    );

    return {
      success: true,
      job,
      message: `Job status updated to ${statusUpdate.status}`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'jobs', action: 'delete' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string) {
    await this.jobsService.remove(id);
  }

  @Post(':id/crew')
  @RequirePermissions({ resource: 'jobs', action: 'assign' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async assignCrew(
    @Param('id') id: string,
    @Body() crewData: { crew: Omit<CrewAssignment, 'assignedAt' | 'status'>[] },
    @CurrentUser() user: User,
  ) {
    const job = await this.jobsService.assignCrew(id, crewData.crew, user.id);

    return {
      success: true,
      job,
      message: 'Crew assigned successfully',
    };
  }

  @Patch(':id/crew/:crewMemberId/status')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  async updateCrewStatus(
    @Param('id') id: string,
    @Param('crewMemberId') crewMemberId: string,
    @Body() statusUpdate: { status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'absent' },
    @CurrentUser() user: User,
  ) {
    const job = await this.jobsService.updateCrewStatus(id, crewMemberId, statusUpdate.status, user.id);

    return {
      success: true,
      job,
      message: `Crew member status updated to ${statusUpdate.status}`,
    };
  }

  @Post(':id/notes')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async addNote(
    @Param('id') id: string,
    @Body() noteData: Omit<InternalNote, 'id' | 'createdAt' | 'createdBy'>,
    @CurrentUser() user: User,
  ) {
    const job = await this.jobsService.addNote(id, { ...noteData, createdBy: user.id }, user.id);

    return {
      success: true,
      job,
      message: 'Note added successfully',
    };
  }

  @Patch(':id/milestones/:milestoneId')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() milestoneUpdate: {
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      notes?: string;
    },
    @CurrentUser() user: User,
  ) {
    const job = await this.jobsService.updateMilestone(id, milestoneId, milestoneUpdate.status, user.id);

    return {
      success: true,
      job,
      message: `Milestone updated to ${milestoneUpdate.status}`,
    };
  }

  @Get('customer/:customerId')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getJobsForCustomer(@Param('customerId') customerId: string) {
    const result = await this.jobsService.findAll({ customerId }, 0, 100);

    return {
      success: true,
      jobs: result.data,
      customerId,
      count: result.data.length,
    };
  }

  @Get('crew/:crewMemberId')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getJobsForCrewMember(@Param('crewMemberId') crewMemberId: string) {
    const result = await this.jobsService.findAll({ assignedCrew: crewMemberId }, 0, 100);

    return {
      success: true,
      jobs: result.data,
      crewMemberId,
      count: result.data.length,
    };
  }

  @Get('calendar/week/:startDate')
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getWeeklySchedule(@Param('startDate') startDateString: string) {
    const startDate = new Date(startDateString);
    if (isNaN(startDate.getTime())) {
      return {
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      };
    }

    const weekSchedule = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const jobs = await this.jobsService.getJobsByDate(date);
      weekSchedule.push({
        date: date.toISOString().split('T')[0],
        jobs,
        count: jobs.length,
      });
    }

    return {
      success: true,
      schedule: weekSchedule,
      weekStart: startDateString,
    };
  }
}