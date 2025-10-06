import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PartnersService } from '../partners/partners.service';
import { ReferralsService } from '../referrals/referrals.service';
import { PartnerLoginDto } from './dto/partner-login.dto';
import { CreateReferralDto } from '../referrals/dto/create-referral.dto';
import { PartnerJwtAuthGuard } from '../auth/guards/partner-jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('api/portal/partner')
export class PartnerPortalController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly referralsService: ReferralsService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Partner login (public endpoint with rate limiting)
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async login(@Body() loginDto: PartnerLoginDto) {
    // Verify partner credentials
    const partner = await this.partnersService.verifyPortalCredentials(
      loginDto.username,
      loginDto.password,
    );

    if (!partner) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token for partner
    const payload = {
      partnerId: (partner as any)._id.toString(),
      email: partner.email,
      companyName: partner.companyName,
      type: 'partner',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });
    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      { expiresIn: '7d' },
    );

    return {
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      partner: {
        id: (partner as any)._id,
        companyName: partner.companyName,
        contactName: partner.contactName,
        email: partner.email,
        partnerType: partner.partnerType,
      },
    };
  }

  /**
   * Get partner dashboard metrics
   */
  @Get('dashboard')
  @UseGuards(PartnerJwtAuthGuard)
  async getDashboard(@Request() req: any) {
    const partnerId = req.user.partnerId;

    // Get partner details
    const partner = await this.partnersService.findById(partnerId);

    // Get referral statistics
    const statistics = await this.referralsService.getStatistics(partnerId);

    // Get conversion funnel
    const funnel = await this.referralsService.getConversionFunnel(partnerId);

    // Get recent referrals
    const recentReferrals =
      await this.referralsService.findByPartner(partnerId);

    return {
      success: true,
      dashboard: {
        partner: {
          companyName: partner.companyName,
          contactName: partner.contactName,
          email: partner.email,
          statistics: partner.statistics,
        },
        statistics,
        funnel,
        recentReferrals: recentReferrals.slice(0, 10),
      },
    };
  }

  /**
   * Get partner's own referrals
   */
  @Get('referrals')
  @UseGuards(PartnerJwtAuthGuard)
  async getReferrals(@Request() req: any) {
    const partnerId = req.user.partnerId;
    const referrals = await this.referralsService.findByPartner(partnerId);

    return {
      success: true,
      referrals,
      total: referrals.length,
    };
  }

  /**
   * Submit a new referral
   */
  @Post('referrals')
  @UseGuards(PartnerJwtAuthGuard)
  async submitReferral(
    @Request() req: any,
    @Body() createReferralDto: CreateReferralDto,
  ) {
    const partnerId = req.user.partnerId;

    // Override partnerId to ensure partner can only create referrals for themselves
    const referralData = {
      ...createReferralDto,
      partnerId,
    };

    const referral = await this.referralsService.create(referralData);

    return {
      success: true,
      message: 'Referral submitted successfully',
      referral,
    };
  }

  /**
   * Get partner's commission history
   */
  @Get('commissions')
  @UseGuards(PartnerJwtAuthGuard)
  async getCommissions(@Request() req: any) {
    const partnerId = req.user.partnerId;

    // Get all won referrals with commission details
    const referrals = await this.referralsService.findByPartner(partnerId, {
      status: 'won',
    });

    const commissions = referrals.map((ref) => ({
      referralId: ref._id,
      customerName: ref.customerFullName,
      moveDate: ref.moveDetails.moveDate,
      jobValue: ref.commissionDetails.finalJobValue,
      commissionAmount: ref.commissionDetails.commissionAmount,
      isPaid: ref.commissionDetails.isPaid,
      paidDate: ref.commissionDetails.paidDate,
      paymentReference: ref.commissionDetails.paymentReference,
    }));

    const totalCommissions = commissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0,
    );
    const paidCommissions = commissions
      .filter((c) => c.isPaid)
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const unpaidCommissions = totalCommissions - paidCommissions;

    return {
      success: true,
      commissions,
      summary: {
        total: totalCommissions,
        paid: paidCommissions,
        unpaid: unpaidCommissions,
      },
    };
  }

  /**
   * Get partner profile
   */
  @Get('profile')
  @UseGuards(PartnerJwtAuthGuard)
  async getProfile(@Request() req: any) {
    const partnerId = req.user.partnerId;
    const partner = await this.partnersService.findById(partnerId);

    return {
      success: true,
      partner: {
        id: (partner as any)._id,
        companyName: partner.companyName,
        contactName: partner.contactName,
        email: partner.email,
        phone: partner.phone,
        partnerType: partner.partnerType,
        address: partner.address,
        website: partner.website,
        statistics: partner.statistics,
        settings: partner.settings,
      },
    };
  }
}
