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
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import {
  CreateJobDto,
  UpdateJobDto,
  JobFilters,
  CrewAssignment,
  InternalNote,
} from './interfaces/job.interface';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createJobDto: CreateJobDto) {
    // For now, use a default user. In the future, this will come from authentication
    const createdBy = 'api-user';

    const job = await this.jobsService.create(createJobDto, createdBy);

    return {
      success: true,
      job,
      message: 'Job created successfully',
    };
  }

  @Get()
  async findAll(@Query() query: any) {
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

    const jobs = await this.jobsService.findAll(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return {
      success: true,
      jobs,
      count: jobs.length,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.jobsService.getJobStats();

    return {
      success: true,
      stats,
    };
  }

  @Get('by-date/:date')
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
  async findOne(@Param('id') id: string) {
    const job = await this.jobsService.findOne(id);

    return {
      success: true,
      job,
    };
  }

  @Get('job-number/:jobNumber')
  async findByJobNumber(@Param('jobNumber') jobNumber: string) {
    const job = await this.jobsService.findByJobNumber(jobNumber);

    return {
      success: true,
      job,
      found: !!job,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const updatedBy = 'api-user';

    const job = await this.jobsService.update(id, updateJobDto, updatedBy);

    return {
      success: true,
      job,
      message: 'Job updated successfully',
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusUpdate: { status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' },
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const updatedBy = 'api-user';

    const job = await this.jobsService.updateStatus(id, statusUpdate.status, updatedBy);

    return {
      success: true,
      job,
      message: `Job status updated to ${statusUpdate.status}`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.jobsService.remove(id);
  }

  @Post(':id/crew')
  async assignCrew(
    @Param('id') id: string,
    @Body() crewData: { crew: Omit<CrewAssignment, 'assignedAt' | 'status'>[] },
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const assignedBy = 'api-user';

    const job = await this.jobsService.assignCrew(id, crewData.crew, assignedBy);

    return {
      success: true,
      job,
      message: 'Crew assigned successfully',
    };
  }

  @Patch(':id/crew/:crewMemberId/status')
  async updateCrewStatus(
    @Param('id') id: string,
    @Param('crewMemberId') crewMemberId: string,
    @Body() statusUpdate: { status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'absent' },
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const updatedBy = 'api-user';

    const job = await this.jobsService.updateCrewStatus(id, crewMemberId, statusUpdate.status, updatedBy);

    return {
      success: true,
      job,
      message: `Crew member status updated to ${statusUpdate.status}`,
    };
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() noteData: Omit<InternalNote, 'id' | 'createdAt' | 'createdBy'>,
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const addedBy = 'api-user';

    const job = await this.jobsService.addNote(id, { ...noteData, createdBy: addedBy }, addedBy);

    return {
      success: true,
      job,
      message: 'Note added successfully',
    };
  }

  @Patch(':id/milestones/:milestoneId')
  async updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() milestoneUpdate: {
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      notes?: string;
    },
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const completedBy = 'api-user';

    const job = await this.jobsService.updateMilestone(id, milestoneId, milestoneUpdate.status, completedBy);

    return {
      success: true,
      job,
      message: `Milestone updated to ${milestoneUpdate.status}`,
    };
  }

  @Get('customer/:customerId')
  async getJobsForCustomer(@Param('customerId') customerId: string) {
    const jobs = await this.jobsService.findAll({ customerId });

    return {
      success: true,
      jobs,
      customerId,
      count: jobs.length,
    };
  }

  @Get('crew/:crewMemberId')
  async getJobsForCrewMember(@Param('crewMemberId') crewMemberId: string) {
    const jobs = await this.jobsService.findAll({ assignedCrew: crewMemberId });

    return {
      success: true,
      jobs,
      crewMemberId,
      count: jobs.length,
    };
  }

  @Get('calendar/week/:startDate')
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