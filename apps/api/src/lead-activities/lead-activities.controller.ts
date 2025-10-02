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
} from '@nestjs/common';
import { LeadActivitiesService } from './lead-activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../types';

@Controller('api/lead-activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadActivitiesController {
  constructor(private readonly activitiesService: LeadActivitiesService) {}

  @Post()
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async createActivity(
    @Body() createDto: CreateActivityDto,
    @Request() req: AuthenticatedRequest
  ) {
    const activity = await this.activitiesService.createActivity(
      createDto,
      req.user.userId
    );

    return {
      success: true,
      activity,
    };
  }

  @Get()
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async findAll(@Query() query: ActivityQueryDto, @Request() req: AuthenticatedRequest) {
    // If not admin, only show user's own activities
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      query.assignedTo = req.user.userId;
    }

    const activities = await this.activitiesService.findAll(query);

    return {
      success: true,
      activities,
      count: activities.length,
    };
  }

  @Get('opportunity/:opportunityId')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async findByOpportunity(@Param('opportunityId') opportunityId: string) {
    const activities = await this.activitiesService.findByOpportunity(opportunityId);

    return {
      success: true,
      activities,
      count: activities.length,
    };
  }

  @Get('customer/:customerId')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async findByCustomer(@Param('customerId') customerId: string) {
    const activities = await this.activitiesService.findByCustomer(customerId);

    return {
      success: true,
      activities,
      count: activities.length,
    };
  }

  @Get('pending')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async findPending(@Request() req: AuthenticatedRequest) {
    const userId = ['super_admin', 'admin'].includes(req.user.role)
      ? undefined
      : req.user.userId;

    const activities = await this.activitiesService.findPendingFollowUps(userId);

    return {
      success: true,
      activities,
      count: activities.length,
    };
  }

  @Get('overdue')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async findOverdue(@Request() req: AuthenticatedRequest) {
    const userId = ['super_admin', 'admin'].includes(req.user.role)
      ? undefined
      : req.user.userId;

    const activities = await this.activitiesService.findOverdueActivities(userId);

    return {
      success: true,
      activities,
      count: activities.length,
    };
  }

  @Get('statistics')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async getStatistics(@Request() req: AuthenticatedRequest, @Query('userId') userId?: string) {
    // If not admin, only show user's own stats
    const targetUserId = ['super_admin', 'admin'].includes(req.user.role)
      ? userId
      : req.user.userId;

    const stats = await this.activitiesService.getActivityStats(targetUserId);

    return {
      success: true,
      statistics: stats,
    };
  }

  @Get('timeline/:opportunityId')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async getTimeline(@Param('opportunityId') opportunityId: string) {
    const timeline = await this.activitiesService.getActivityTimeline(opportunityId);

    return {
      success: true,
      timeline,
      count: timeline.length,
    };
  }

  @Get(':activityId')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async findOne(@Param('activityId') activityId: string) {
    const activity = await this.activitiesService.findById(activityId);

    return {
      success: true,
      activity,
    };
  }

  @Patch(':activityId/complete')
  @Roles('super_admin', 'admin', 'dispatcher', 'sales')
  async completeActivity(
    @Param('activityId') activityId: string,
    @Body() completeDto: CompleteActivityDto,
    @Request() req: AuthenticatedRequest
  ) {
    const activity = await this.activitiesService.completeActivity(
      activityId,
      completeDto,
      req.user.userId
    );

    return {
      success: true,
      activity,
      message: 'Activity marked as complete',
    };
  }

  @Delete(':activityId')
  @Roles('super_admin', 'admin')
  async deleteActivity(@Param('activityId') activityId: string) {
    await this.activitiesService.deleteActivity(activityId);

    return {
      success: true,
      message: 'Activity deleted successfully',
    };
  }
}
