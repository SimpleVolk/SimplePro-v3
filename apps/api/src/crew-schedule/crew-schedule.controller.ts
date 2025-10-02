import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CrewScheduleService,
  TimeOffService,
  AutoAssignmentService,
  WorkloadService,
} from './services';
import {
  SetAvailabilityDto,
  UpdateAvailabilityDto,
  RecurringAvailabilityDto,
  TimeOffRequestDto,
  ReviewTimeOffDto,
  TimeOffFiltersDto,
  AutoAssignDto,
  ManualAssignDto,
} from './dto';
import { parseISO } from 'date-fns';

@Controller('crew-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrewScheduleController {
  constructor(
    private readonly crewScheduleService: CrewScheduleService,
    private readonly timeOffService: TimeOffService,
    private readonly autoAssignmentService: AutoAssignmentService,
    private readonly workloadService: WorkloadService,
  ) {}

  // ==================== Availability Endpoints ====================

  @Get('availability/:crewId')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async getAvailability(
    @Param('crewId') crewId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? parseISO(startDate) : new Date();
    const end = endDate ? parseISO(endDate) : new Date();

    const availability = await this.crewScheduleService.getAvailability(
      crewId,
      start,
      end,
    );

    return {
      success: true,
      data: availability,
      count: availability.length,
    };
  }

  @Post('availability')
  @Roles('super_admin', 'admin', 'dispatcher')
  async setAvailability(@Body() dto: SetAvailabilityDto) {
    const availability = await this.crewScheduleService.setAvailability(dto);
    return {
      success: true,
      message: 'Availability set successfully',
      data: availability,
    };
  }

  @Post('availability/recurring')
  @Roles('super_admin', 'admin', 'dispatcher')
  async setRecurringAvailability(@Body() dto: RecurringAvailabilityDto) {
    const availabilities =
      await this.crewScheduleService.setRecurringAvailability(dto);
    return {
      success: true,
      message: `Recurring availability set for ${availabilities.length} dates`,
      data: availabilities,
      count: availabilities.length,
    };
  }

  @Patch('availability/:id')
  @Roles('super_admin', 'admin', 'dispatcher')
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const availability = await this.crewScheduleService.updateAvailability(
      id,
      dto,
    );
    return {
      success: true,
      message: 'Availability updated successfully',
      data: availability,
    };
  }

  @Delete('availability/:id')
  @Roles('super_admin', 'admin', 'dispatcher')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvailability(@Param('id') id: string) {
    await this.crewScheduleService.deleteAvailability(id);
  }

  // ==================== Time Off Endpoints ====================

  @Post('time-off')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async requestTimeOff(@Body() dto: TimeOffRequestDto, @Request() req) {
    const request = await this.timeOffService.requestTimeOff(
      dto,
      req.user.userId,
    );
    return {
      success: true,
      message: 'Time off request submitted successfully',
      data: request,
    };
  }

  @Patch('time-off/:id/review')
  @Roles('super_admin', 'admin', 'dispatcher')
  async reviewTimeOffRequest(
    @Param('id') id: string,
    @Body() dto: ReviewTimeOffDto,
    @Request() req,
  ) {
    const request = await this.timeOffService.reviewTimeOffRequest(
      id,
      dto.decision,
      req.user.userId,
      dto.reviewNotes,
    );
    return {
      success: true,
      message: `Time off request ${dto.decision}`,
      data: request,
    };
  }

  @Get('time-off')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async getTimeOffRequests(@Query() filters: TimeOffFiltersDto) {
    const requests = await this.timeOffService.getTimeOffRequests(filters);
    return {
      success: true,
      data: requests,
      count: requests.length,
    };
  }

  @Delete('time-off/:id')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelTimeOffRequest(@Param('id') id: string, @Request() req) {
    await this.timeOffService.cancelTimeOffRequest(id, req.user.userId);
  }

  @Get('time-off/upcoming/:crewId')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async getUpcomingTimeOff(@Param('crewId') crewId: string) {
    const timeOff = await this.timeOffService.getUpcomingTimeOff(crewId);
    return {
      success: true,
      data: timeOff,
      count: timeOff.length,
    };
  }

  // ==================== Scheduling Endpoints ====================

  @Get('conflicts/:jobId')
  @Roles('super_admin', 'admin', 'dispatcher')
  async checkConflicts(@Param('jobId') jobId: string) {
    const conflicts = await this.crewScheduleService.checkConflicts(jobId);
    return {
      success: true,
      data: conflicts,
      hasConflicts: conflicts.length > 0,
      count: conflicts.length,
    };
  }

  @Get('weekly/:startDate')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getWeeklySchedule(@Param('startDate') startDate: string) {
    const start = parseISO(startDate);
    const schedule = await this.crewScheduleService.getWeeklySchedule(start);
    return {
      success: true,
      data: schedule,
    };
  }

  // ==================== Auto-Assignment Endpoints ====================

  @Post('auto-assign/:jobId')
  @Roles('super_admin', 'admin', 'dispatcher')
  async autoAssignCrew(
    @Param('jobId') jobId: string,
    @Body() dto: AutoAssignDto,
    @Request() req,
  ) {
    const requirements = {
      requiredSkills: dto.requiredSkills,
      crewSize: dto.crewSize,
      jobDate: parseISO(dto.jobDate),
      estimatedDuration: dto.estimatedDuration,
      preferredCrewLeadId: dto.preferredCrewLeadId,
      excludeCrewIds: dto.excludeCrewIds,
    };

    const assignment = await this.autoAssignmentService.autoAssignCrew(
      jobId,
      requirements,
      req.user.userId,
    );

    return {
      success: true,
      message: 'Crew assigned automatically',
      data: assignment,
    };
  }

  @Get('suggestions/:jobId')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getCrewSuggestions(
    @Param('jobId') jobId: string,
    @Query() dto: AutoAssignDto,
  ) {
    const requirements = {
      requiredSkills: dto.requiredSkills,
      crewSize: dto.crewSize,
      jobDate: parseISO(dto.jobDate),
      estimatedDuration: dto.estimatedDuration,
      preferredCrewLeadId: dto.preferredCrewLeadId,
      excludeCrewIds: dto.excludeCrewIds,
    };

    const suggestions = await this.autoAssignmentService.suggestCrew(
      jobId,
      requirements,
    );

    return {
      success: true,
      data: suggestions,
      count: suggestions.length,
    };
  }

  @Get('assignment/:jobId')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async getCrewAssignment(@Param('jobId') jobId: string) {
    const assignment =
      await this.autoAssignmentService.getCrewAssignment(jobId);
    return {
      success: true,
      data: assignment,
    };
  }

  @Patch('assignment/:id/confirm')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async confirmAssignment(@Param('id') id: string, @Request() req) {
    const assignment = await this.autoAssignmentService.confirmAssignment(
      id,
      req.user.userId,
    );
    return {
      success: true,
      message: 'Assignment confirmed',
      data: assignment,
    };
  }

  // ==================== Workload Endpoints ====================

  @Get('workload')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getWorkloadDistribution(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? parseISO(startDate) : new Date();
    const end = endDate ? parseISO(endDate) : new Date();

    const distribution = await this.workloadService.getWorkloadDistribution(
      start,
      end,
    );

    return {
      success: true,
      data: distribution,
      count: distribution.length,
    };
  }

  @Get('workload/:crewId')
  @Roles('super_admin', 'admin', 'dispatcher', 'crew')
  async getCrewWorkload(
    @Param('crewId') crewId: string,
    @Query('weekStartDate') weekStartDate: string,
  ) {
    const weekStart = weekStartDate ? parseISO(weekStartDate) : new Date();
    const workload = await this.workloadService.getCrewWorkload(
      crewId,
      weekStart,
    );

    return {
      success: true,
      data: workload,
    };
  }

  @Get('workload/overloaded')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getOverloadedCrew(@Query('weekStartDate') weekStartDate: string) {
    const weekStart = weekStartDate ? parseISO(weekStartDate) : new Date();
    const overloadedCrew =
      await this.workloadService.getOverloadedCrew(weekStart);

    return {
      success: true,
      data: overloadedCrew,
      count: overloadedCrew.length,
    };
  }

  @Get('workload/balance')
  @Roles('super_admin', 'admin', 'dispatcher')
  async balanceWorkload(@Query('jobDate') jobDate: string) {
    const date = jobDate ? parseISO(jobDate) : new Date();
    const result = await this.workloadService.balanceWorkload(date);

    return {
      success: true,
      data: result,
    };
  }

  @Post('workload/:crewId/calculate')
  @Roles('super_admin', 'admin', 'dispatcher')
  async calculateWorkload(
    @Param('crewId') crewId: string,
    @Query('weekStartDate') weekStartDate: string,
  ) {
    const weekStart = weekStartDate ? parseISO(weekStartDate) : new Date();
    const workload = await this.workloadService.calculateWorkload(
      crewId,
      weekStart,
    );

    return {
      success: true,
      message: 'Workload calculated successfully',
      data: workload,
    };
  }
}
