import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { UpdateReferralStatusDto } from './dto/update-referral-status.dto';
import { MarkCommissionPaidDto } from './dto/mark-commission-paid.dto';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /**
   * Create a new referral
   */
  @Post()
  @Roles('super_admin', 'admin', 'dispatcher')
  async create(@Body() createReferralDto: CreateReferralDto) {
    const referral = await this.referralsService.create(createReferralDto);
    return {
      success: true,
      message: 'Referral created successfully',
      referral
    };
  }

  /**
   * Get all referrals with filtering
   */
  @Get()
  @Roles('super_admin', 'admin', 'dispatcher')
  async findAll(@Query() query: ReferralQueryDto) {
    const result = await this.referralsService.findAll(query);
    return {
      success: true,
      ...result
    };
  }

  /**
   * Get referrals by partner
   */
  @Get('partner/:partnerId')
  @Roles('super_admin', 'admin', 'dispatcher')
  async findByPartner(@Param('partnerId') partnerId: string, @Query() query?: ReferralQueryDto) {
    const referrals = await this.referralsService.findByPartner(partnerId, query);
    return {
      success: true,
      referrals,
      total: referrals.length
    };
  }

  /**
   * Get referrals with pending commissions
   */
  @Get('pending-commissions')
  @Roles('super_admin', 'admin')
  async findPendingCommissions() {
    const referrals = await this.referralsService.findPendingCommissions();
    return {
      success: true,
      referrals,
      total: referrals.length
    };
  }

  /**
   * Get referral statistics
   */
  @Get('statistics')
  @Roles('super_admin', 'admin')
  async getStatistics(
    @Query('partnerId') partnerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const statistics = await this.referralsService.getStatistics(partnerId, startDate, endDate);
    return {
      success: true,
      statistics
    };
  }

  /**
   * Get conversion funnel data
   */
  @Get('conversion-funnel')
  @Roles('super_admin', 'admin')
  async getConversionFunnel(
    @Query('partnerId') partnerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const funnel = await this.referralsService.getConversionFunnel(partnerId, startDate, endDate);
    return {
      success: true,
      funnel
    };
  }

  /**
   * Get referral by ID
   */
  @Get(':id')
  @Roles('super_admin', 'admin', 'dispatcher')
  async findById(@Param('id') id: string) {
    const referral = await this.referralsService.findById(id);
    return {
      success: true,
      referral
    };
  }

  /**
   * Update referral information
   */
  @Patch(':id')
  @Roles('super_admin', 'admin', 'dispatcher')
  async update(@Param('id') id: string, @Body() updateReferralDto: UpdateReferralDto) {
    const referral = await this.referralsService.update(id, updateReferralDto);
    return {
      success: true,
      message: 'Referral updated successfully',
      referral
    };
  }

  /**
   * Update referral status
   */
  @Patch(':id/status')
  @Roles('super_admin', 'admin', 'dispatcher')
  async updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateReferralStatusDto) {
    const referral = await this.referralsService.updateStatus(id, updateStatusDto);
    return {
      success: true,
      message: 'Referral status updated successfully',
      referral
    };
  }

  /**
   * Convert referral to job
   */
  @Post(':id/convert-to-job')
  @Roles('super_admin', 'admin', 'dispatcher')
  async convertToJob(
    @Param('id') id: string,
    @Body('jobId') jobId: string,
    @Body('jobValue') jobValue: number
  ) {
    const referral = await this.referralsService.convertToJob(id, jobId, jobValue);
    return {
      success: true,
      message: 'Referral converted to job successfully',
      referral
    };
  }

  /**
   * Link referral to opportunity
   */
  @Post(':id/link-opportunity')
  @Roles('super_admin', 'admin', 'dispatcher')
  async linkToOpportunity(@Param('id') id: string, @Body('opportunityId') opportunityId: string) {
    const referral = await this.referralsService.linkToOpportunity(id, opportunityId);
    return {
      success: true,
      message: 'Referral linked to opportunity successfully',
      referral
    };
  }

  /**
   * Link referral to customer
   */
  @Post(':id/link-customer')
  @Roles('super_admin', 'admin', 'dispatcher')
  async linkToCustomer(@Param('id') id: string, @Body('customerId') customerId: string) {
    const referral = await this.referralsService.linkToCustomer(id, customerId);
    return {
      success: true,
      message: 'Referral linked to customer successfully',
      referral
    };
  }

  /**
   * Mark commission as paid
   */
  @Patch(':id/commission-paid')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  async markCommissionPaid(@Param('id') id: string, @Body() markPaidDto: MarkCommissionPaidDto) {
    const referral = await this.referralsService.markCommissionPaid(id, markPaidDto);
    return {
      success: true,
      message: 'Commission marked as paid successfully',
      referral
    };
  }
}
