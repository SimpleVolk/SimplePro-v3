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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import type { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../auth/interfaces/user.interface';

@Controller('opportunities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOpportunityDto: CreateOpportunityDto,
    @CurrentUser() user: User,
  ) {
    const opportunity = await this.opportunitiesService.create(
      createOpportunityDto,
      createOpportunityDto.createdBy || user.id,
    );

    return {
      success: true,
      opportunity,
      message: 'Opportunity created successfully',
    };
  }

  @Get()
  async findAll(@Query() query: any) {
    const opportunities = await this.opportunitiesService.findAll(query);

    return {
      success: true,
      opportunities,
      count: opportunities.length,
    };
  }

  @Get('statistics')
  async getStatistics(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
  ) {
    const stats = await this.opportunitiesService.getStatistics(
      userId || user.id,
    );

    return {
      success: true,
      statistics: stats,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const opportunity = await this.opportunitiesService.findById(id);

    return {
      success: true,
      opportunity,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateOpportunityDto>,
    @CurrentUser() user: User,
  ) {
    const opportunity = await this.opportunitiesService.update(
      id,
      updateDto,
      user.id,
    );

    return {
      success: true,
      opportunity,
      message: 'Opportunity updated successfully',
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: User,
  ) {
    const opportunity = await this.opportunitiesService.updateStatus(
      id,
      body.status,
      user.id,
    );

    return {
      success: true,
      opportunity,
      message: 'Opportunity status updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.opportunitiesService.delete(id);
  }
}
