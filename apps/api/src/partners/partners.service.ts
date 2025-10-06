import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Partner, PartnerDocument } from './schemas/partner.schema';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { EnablePortalAccessDto } from './dto/enable-portal-access.dto';
import { PartnerQueryDto } from './dto/partner-query.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
  ) {}

  /**
   * Create a new partner
   */
  async create(
    createPartnerDto: CreatePartnerDto,
    userId: string,
  ): Promise<PartnerDocument> {
    // Check if partner with email already exists
    const existingPartner = await this.partnerModel.findOne({
      email: createPartnerDto.email,
    });
    if (existingPartner) {
      throw new ConflictException('Partner with this email already exists');
    }

    // Validate commission structure
    this.validateCommissionStructure(createPartnerDto.commissionStructure);

    const partner = new this.partnerModel({
      ...createPartnerDto,
      createdBy: userId,
      address: {
        ...createPartnerDto.address,
        country: createPartnerDto.address.country || 'USA',
      },
    });

    return partner.save();
  }

  /**
   * Find all partners with filtering and pagination
   */
  async findAll(query: PartnerQueryDto): Promise<{
    partners: PartnerDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      partnerType,
      status,
      search,
      tag,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (partnerType) {
      filter.partnerType = partnerType;
    }

    if (status) {
      filter.status = status;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const sortField =
      sortBy === 'totalLeadsReferred'
        ? 'statistics.totalLeadsReferred'
        : sortBy === 'totalRevenue'
          ? 'statistics.totalRevenue'
          : sortBy === 'conversionRate'
            ? 'statistics.conversionRate'
            : 'createdAt';

    const sortOptions: any = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const skip = (page - 1) * limit;

    const [partners, total] = await Promise.all([
      this.partnerModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.partnerModel.countDocuments(filter),
    ]);

    return { partners, total, page, limit };
  }

  /**
   * Find partner by ID
   */
  async findById(partnerId: string): Promise<PartnerDocument> {
    const partner = await this.partnerModel.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    return partner;
  }

  /**
   * Find partner by email
   */
  async findByEmail(email: string): Promise<PartnerDocument | null> {
    return this.partnerModel.findOne({ email });
  }

  /**
   * Update partner information
   */
  async update(
    partnerId: string,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<PartnerDocument> {
    // Check if email is being changed and if it's already in use
    if (updatePartnerDto.email) {
      const existingPartner = await this.partnerModel.findOne({
        email: updatePartnerDto.email,
        _id: { $ne: partnerId },
      });
      if (existingPartner) {
        throw new ConflictException('Partner with this email already exists');
      }
    }

    // Validate commission structure if provided
    if (updatePartnerDto.commissionStructure) {
      this.validateCommissionStructure(updatePartnerDto.commissionStructure);
    }

    const partner = await this.partnerModel.findByIdAndUpdate(
      partnerId,
      { $set: updatePartnerDto },
      { new: true, runValidators: true },
    );

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  /**
   * Deactivate partner
   */
  async deactivate(partnerId: string): Promise<PartnerDocument> {
    const partner = await this.partnerModel.findByIdAndUpdate(
      partnerId,
      { $set: { status: 'inactive' } },
      { new: true },
    );

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  /**
   * Enable or disable portal access for a partner
   */
  async updatePortalAccess(
    partnerId: string,
    enablePortalDto: EnablePortalAccessDto,
  ): Promise<PartnerDocument> {
    const partner = await this.findById(partnerId);

    const portalAccess: any = { enabled: enablePortalDto.enabled };

    if (enablePortalDto.enabled) {
      if (!enablePortalDto.username || !enablePortalDto.password) {
        throw new BadRequestException(
          'Username and password are required to enable portal access',
        );
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(enablePortalDto.password, 12);
      portalAccess.username = enablePortalDto.username;
      portalAccess.hashedPassword = hashedPassword;
    } else {
      // Clear portal credentials when disabling
      portalAccess.username = undefined;
      portalAccess.hashedPassword = undefined;
      portalAccess.lastLogin = undefined;
    }

    partner.portalAccess = portalAccess;
    return partner.save();
  }

  /**
   * Update partner statistics
   */
  async updateStatistics(
    partnerId: string,
    statistics: Partial<Partner['statistics']>,
  ): Promise<PartnerDocument> {
    const partner = await this.findById(partnerId);

    // Update statistics
    partner.statistics = {
      ...partner.statistics,
      ...statistics,
    };

    // Recalculate conversion rate
    if (partner.statistics.totalLeadsReferred > 0) {
      partner.statistics.conversionRate =
        (partner.statistics.totalLeadsConverted /
          partner.statistics.totalLeadsReferred) *
        100;
    } else {
      partner.statistics.conversionRate = 0;
    }

    return partner.save();
  }

  /**
   * Increment lead count for partner
   */
  async incrementLeadCount(partnerId: string): Promise<void> {
    await this.partnerModel.findByIdAndUpdate(partnerId, {
      $inc: { 'statistics.totalLeadsReferred': 1 },
    });
  }

  /**
   * Record lead conversion
   */
  async recordLeadConversion(
    partnerId: string,
    jobValue: number,
  ): Promise<void> {
    const partner = await this.findById(partnerId);

    partner.statistics.totalLeadsConverted += 1;
    partner.statistics.totalRevenue += jobValue;

    // Recalculate conversion rate
    if (partner.statistics.totalLeadsReferred > 0) {
      partner.statistics.conversionRate =
        (partner.statistics.totalLeadsConverted /
          partner.statistics.totalLeadsReferred) *
        100;
    }

    await partner.save();
  }

  /**
   * Record commission payment
   */
  async recordCommissionPayment(
    partnerId: string,
    amount: number,
  ): Promise<void> {
    await this.partnerModel.findByIdAndUpdate(partnerId, {
      $inc: { 'statistics.totalCommissionsPaid': amount },
    });
  }

  /**
   * Get top performing partners
   */
  async getTopPartners(
    limit = 10,
    sortBy: 'leads' | 'revenue' | 'conversion' = 'leads',
  ): Promise<PartnerDocument[]> {
    const sortField =
      sortBy === 'leads'
        ? 'statistics.totalLeadsReferred'
        : sortBy === 'revenue'
          ? 'statistics.totalRevenue'
          : 'statistics.conversionRate';

    return this.partnerModel
      .find({ status: 'active' })
      .sort({ [sortField]: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Search partners by text
   */
  async searchPartners(
    searchTerm: string,
    limit = 20,
  ): Promise<PartnerDocument[]> {
    return this.partnerModel
      .find(
        { $text: { $search: searchTerm } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();
  }

  /**
   * Calculate commission for a partner based on job value
   */
  calculateCommission(partner: PartnerDocument, jobValue: number): number {
    const { commissionStructure } = partner;

    switch (commissionStructure.type) {
      case 'percentage':
        if (!commissionStructure.rate) {
          throw new BadRequestException(
            'Commission rate not defined for percentage type',
          );
        }
        return jobValue * (commissionStructure.rate / 100);

      case 'flat_rate':
        if (!commissionStructure.flatAmount) {
          throw new BadRequestException(
            'Flat amount not defined for flat_rate type',
          );
        }
        return commissionStructure.flatAmount;

      case 'tiered':
        if (
          !commissionStructure.tiers ||
          commissionStructure.tiers.length === 0
        ) {
          throw new BadRequestException(
            'Tiers not defined for tiered commission type',
          );
        }

        // Find applicable tier
        // eslint-disable-next-line no-case-declarations
        const tier = commissionStructure.tiers.find(
          (t) => jobValue >= t.minValue && jobValue <= t.maxValue,
        );

        if (!tier) {
          // If no tier matches, use the highest tier's rate if job value exceeds max
          const highestTier = commissionStructure.tiers.reduce((max, t) =>
            t.maxValue > max.maxValue ? t : max,
          );

          if (jobValue > highestTier.maxValue) {
            return jobValue * (highestTier.rate / 100);
          }

          throw new BadRequestException(
            `No commission tier found for job value: ${jobValue}`,
          );
        }

        return jobValue * (tier.rate / 100);

      case 'custom':
        // For custom commission structures, return 0 and handle manually
        return 0;

      default:
        throw new BadRequestException('Invalid commission type');
    }
  }

  /**
   * Validate commission structure
   */
  private validateCommissionStructure(structure: any): void {
    switch (structure.type) {
      case 'percentage':
        if (!structure.rate || structure.rate < 0 || structure.rate > 100) {
          throw new BadRequestException(
            'Commission rate must be between 0 and 100 for percentage type',
          );
        }
        break;

      case 'flat_rate':
        if (!structure.flatAmount || structure.flatAmount < 0) {
          throw new BadRequestException(
            'Flat amount must be greater than 0 for flat_rate type',
          );
        }
        break;

      case 'tiered':
        if (!structure.tiers || structure.tiers.length === 0) {
          throw new BadRequestException(
            'At least one tier is required for tiered commission type',
          );
        }

        // Validate each tier
        structure.tiers.forEach((tier: any, index: number) => {
          if (tier.minValue < 0 || tier.maxValue < 0) {
            throw new BadRequestException(
              `Tier ${index + 1}: Values must be non-negative`,
            );
          }
          if (tier.minValue >= tier.maxValue) {
            throw new BadRequestException(
              `Tier ${index + 1}: minValue must be less than maxValue`,
            );
          }
          if (tier.rate < 0 || tier.rate > 100) {
            throw new BadRequestException(
              `Tier ${index + 1}: Rate must be between 0 and 100`,
            );
          }
        });
        break;

      case 'custom':
        // No validation for custom type
        break;

      default:
        throw new BadRequestException('Invalid commission type');
    }
  }

  /**
   * Update last login time for portal access
   */
  async updateLastLogin(partnerId: string): Promise<void> {
    await this.partnerModel.findByIdAndUpdate(partnerId, {
      $set: { 'portalAccess.lastLogin': new Date() },
    });
  }

  /**
   * Verify partner portal credentials
   */
  async verifyPortalCredentials(
    username: string,
    password: string,
  ): Promise<PartnerDocument | null> {
    const partner = await this.partnerModel.findOne({
      'portalAccess.username': username,
      'portalAccess.enabled': true,
      status: 'active',
    });

    if (!partner || !partner.portalAccess.hashedPassword) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      partner.portalAccess.hashedPassword,
    );

    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin((partner as any)._id.toString());

    return partner;
  }
}
