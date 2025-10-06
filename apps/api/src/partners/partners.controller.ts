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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { EnablePortalAccessDto } from './dto/enable-portal-access.dto';
import { PartnerQueryDto } from './dto/partner-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  /**
   * Create a new partner (Admin only)
   */
  @Post()
  @Roles('super_admin', 'admin')
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @Request() req: any,
  ) {
    const partner = await this.partnersService.create(
      createPartnerDto,
      req.user.userId,
    );
    return {
      success: true,
      message: 'Partner created successfully',
      partner,
    };
  }

  /**
   * Get all partners with filtering
   */
  @Get()
  @Roles('super_admin', 'admin', 'dispatcher')
  async findAll(@Query() query: PartnerQueryDto) {
    const result = await this.partnersService.findAll(query);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get top performing partners
   */
  @Get('top')
  @Roles('super_admin', 'admin')
  async getTopPartners(
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'leads' | 'revenue' | 'conversion',
  ) {
    const partners = await this.partnersService.getTopPartners(
      limit ? parseInt(limit, 10) : 10,
      sortBy || 'leads',
    );
    return {
      success: true,
      partners,
    };
  }

  /**
   * Search partners by text
   */
  @Get('search')
  @Roles('super_admin', 'admin', 'dispatcher')
  async searchPartners(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: string,
  ) {
    const partners = await this.partnersService.searchPartners(
      searchTerm,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      success: true,
      partners,
    };
  }

  /**
   * Get partner by ID
   */
  @Get(':id')
  @Roles('super_admin', 'admin', 'dispatcher')
  async findById(@Param('id') id: string) {
    const partner = await this.partnersService.findById(id);
    return {
      success: true,
      partner,
    };
  }

  /**
   * Get partner statistics
   */
  @Get(':id/statistics')
  @Roles('super_admin', 'admin')
  async getStatistics(@Param('id') id: string) {
    const partner = await this.partnersService.findById(id);
    return {
      success: true,
      statistics: partner.statistics,
    };
  }

  /**
   * Update partner information
   */
  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    const partner = await this.partnersService.update(id, updatePartnerDto);
    return {
      success: true,
      message: 'Partner updated successfully',
      partner,
    };
  }

  /**
   * Enable/disable partner portal access
   */
  @Post(':id/portal')
  @Roles('super_admin', 'admin')
  async updatePortalAccess(
    @Param('id') id: string,
    @Body() enablePortalDto: EnablePortalAccessDto,
  ) {
    const partner = await this.partnersService.updatePortalAccess(
      id,
      enablePortalDto,
    );
    return {
      success: true,
      message: enablePortalDto.enabled
        ? 'Portal access enabled'
        : 'Portal access disabled',
      partner,
    };
  }

  /**
   * Calculate commission for a job value
   */
  @Post(':id/calculate-commission')
  @Roles('super_admin', 'admin', 'dispatcher')
  async calculateCommission(
    @Param('id') id: string,
    @Body('jobValue') jobValue: number,
  ) {
    const partner = await this.partnersService.findById(id);
    const commission = this.partnersService.calculateCommission(
      partner,
      jobValue,
    );
    return {
      success: true,
      commission,
      jobValue,
      commissionStructure: partner.commissionStructure,
    };
  }

  /**
   * Deactivate partner
   */
  @Delete(':id')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    const partner = await this.partnersService.deactivate(id);
    return {
      success: true,
      message: 'Partner deactivated successfully',
      partner,
    };
  }
}
