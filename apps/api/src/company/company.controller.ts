import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('company')
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  /**
   * GET /api/company/settings
   * Get company settings
   * Requires: Authenticated user
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings() {
    this.logger.log('GET /api/company/settings');
    const settings = await this.companyService.getSettings();

    return {
      success: true,
      data: settings,
    };
  }

  /**
   * PATCH /api/company/settings
   * Update company settings
   * Requires: ADMIN or SUPER_ADMIN role
   */
  @Patch('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Body() updateDto: UpdateCompanySettingsDto,
    @Request() req: any,
  ) {
    this.logger.log(`PATCH /api/company/settings by user: ${req.user.userId}`);

    const updatedSettings = await this.companyService.updateSettings(
      updateDto,
      req.user.userId,
    );

    return {
      success: true,
      message: 'Company settings updated successfully',
      data: updatedSettings,
    };
  }

  /**
   * GET /api/company/profile
   * Get public company profile
   * Requires: Authenticated user
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getPublicProfile() {
    this.logger.log('GET /api/company/profile');
    const profile = await this.companyService.getPublicProfile();

    return {
      success: true,
      data: profile,
    };
  }

  /**
   * GET /api/company/business-hours
   * Get business hours
   * Requires: Authenticated user
   */
  @Get('business-hours')
  @UseGuards(JwtAuthGuard)
  async getBusinessHours() {
    this.logger.log('GET /api/company/business-hours');
    const businessHours = await this.companyService.getBusinessHours();

    return {
      success: true,
      data: businessHours,
    };
  }

  /**
   * GET /api/company/timezones
   * Get list of supported timezones
   * Requires: Authenticated user
   */
  @Get('timezones')
  @UseGuards(JwtAuthGuard)
  async getTimezones() {
    this.logger.log('GET /api/company/timezones');
    const timezones = this.companyService.getTimezones();

    return {
      success: true,
      data: timezones,
    };
  }

  /**
   * GET /api/company/currencies
   * Get list of supported currencies
   * Requires: Authenticated user
   */
  @Get('currencies')
  @UseGuards(JwtAuthGuard)
  async getCurrencies() {
    this.logger.log('GET /api/company/currencies');
    const currencies = this.companyService.getCurrencies();

    return {
      success: true,
      data: currencies,
    };
  }
}