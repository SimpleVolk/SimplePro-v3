import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanySettings, CompanySettingsDocument } from './schemas/company-settings.schema';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectModel(CompanySettings.name)
    private companySettingsModel: Model<CompanySettingsDocument>,
  ) {}

  /**
   * Get current company settings
   * Creates default settings if none exist
   */
  async getSettings(): Promise<CompanySettingsDocument> {
    this.logger.log('Fetching company settings');

    const settings = await this.companySettingsModel.findOne().exec();

    if (!settings) {
      this.logger.log('No settings found, initializing default settings');
      return await this.initializeDefaults();
    }

    return settings;
  }

  /**
   * Update company settings
   * Performs validation and business logic checks
   */
  async updateSettings(
    updateDto: UpdateCompanySettingsDto,
    userId: string,
  ): Promise<CompanySettingsDocument> {
    this.logger.log(`Updating company settings by user: ${userId}`);

    // Validate business hours if provided
    if (updateDto.businessHours) {
      this.validateBusinessHours(updateDto.businessHours);
    }

    // Get existing settings or create defaults
    const existingSettings = await this.companySettingsModel.findOne().exec();

    if (!existingSettings) {
      this.logger.log('No settings found, creating with provided data');
      await this.initializeDefaults();
    }

    // Update settings with new data
    const updateData = {
      ...updateDto,
      updatedBy: userId,
    };

    const updatedSettings = await this.companySettingsModel
      .findOneAndUpdate({}, updateData, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!updatedSettings) {
      throw new NotFoundException('Failed to update company settings');
    }

    this.logger.log('Company settings updated successfully');
    return updatedSettings;
  }

  /**
   * Initialize default company settings
   * Called on first app startup or when no settings exist
   */
  async initializeDefaults(): Promise<CompanySettingsDocument> {
    this.logger.log('Initializing default company settings');

    const defaultSettings = {
      companyName: 'SimplePro Moving Company',
      legalName: 'SimplePro Moving Company LLC',
      taxId: '12-3456789',
      email: 'info@simplepromoving.com',
      phone: '(555) 123-4567',
      website: 'https://simplepromoving.com',
      address: {
        street: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      businessHours: {
        monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        saturday: { isOpen: true, openTime: '08:00', closeTime: '16:00' },
        sunday: { isOpen: false, openTime: undefined, closeTime: undefined },
      },
      preferences: {
        defaultCrewSize: 4,
        defaultServiceRadius: 50,
        requireEstimateApproval: true,
        allowOnlineBooking: false,
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h' as const,
      },
      updatedBy: 'system',
    };

    const settings = new this.companySettingsModel(defaultSettings);
    await settings.save();

    this.logger.log('Default company settings initialized successfully');
    return settings;
  }

  /**
   * Get public company profile
   * Returns limited information suitable for public display
   */
  async getPublicProfile() {
    const settings = await this.getSettings();

    return {
      companyName: settings.companyName,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      address: settings.address,
      businessHours: settings.businessHours,
    };
  }

  /**
   * Get business hours only
   */
  async getBusinessHours() {
    const settings = await this.getSettings();
    return settings.businessHours;
  }

  /**
   * Get list of supported timezones
   */
  getTimezones(): string[] {
    return [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ];
  }

  /**
   * Get list of supported currencies
   */
  getCurrencies() {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    ];
  }

  /**
   * Validate business hours logic
   */
  private validateBusinessHours(businessHours: any): void {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      const hours = businessHours[day];

      if (!hours) {
        throw new BadRequestException(`Business hours for ${day} are required`);
      }

      if (hours.isOpen) {
        if (!hours.openTime || !hours.closeTime) {
          throw new BadRequestException(
            `Open and close times are required when ${day} is marked as open`,
          );
        }

        // Validate time format and logic
        const openParts = hours.openTime.split(':');
        const closeParts = hours.closeTime.split(':');

        const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
        const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

        if (openMinutes >= closeMinutes) {
          throw new BadRequestException(
            `Close time must be after open time for ${day}`,
          );
        }
      }
    }
  }
}