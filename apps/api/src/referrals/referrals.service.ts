import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Referral, ReferralDocument } from './schemas/referral.schema';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { UpdateReferralStatusDto } from './dto/update-referral-status.dto';
import { MarkCommissionPaidDto } from './dto/mark-commission-paid.dto';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { PartnersService } from '../partners/partners.service';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
    private partnersService: PartnersService,
  ) {}

  /**
   * Create a new referral
   */
  async create(createReferralDto: CreateReferralDto): Promise<ReferralDocument> {
    // Validate partner exists
    await this.partnersService.findById(createReferralDto.partnerId);

    const referral = new this.referralModel({
      ...createReferralDto,
      partnerId: new Types.ObjectId(createReferralDto.partnerId),
      customerId: createReferralDto.customerId ? new Types.ObjectId(createReferralDto.customerId) : undefined,
      referralDate: createReferralDto.referralDate || new Date(),
      leadQuality: createReferralDto.leadQuality || 'warm'
    });

    const savedReferral = await referral.save();

    // Increment partner's lead count
    await this.partnersService.incrementLeadCount(createReferralDto.partnerId);

    return savedReferral;
  }

  /**
   * Find all referrals with filtering and pagination
   */
  async findAll(query: ReferralQueryDto): Promise<{
    referrals: ReferralDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      partnerId,
      status,
      leadQuality,
      assignedSalesRep,
      search,
      pendingCommission,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'referralDate',
      sortOrder = 'desc'
    } = query;

    const filter: any = {};

    if (partnerId) {
      filter.partnerId = new Types.ObjectId(partnerId);
    }

    if (status) {
      filter.status = status;
    }

    if (leadQuality) {
      filter.leadQuality = leadQuality;
    }

    if (assignedSalesRep) {
      filter.assignedSalesRep = assignedSalesRep;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (pendingCommission) {
      filter.$and = [
        { status: 'won' },
        { 'commissionDetails.isPaid': false }
      ];
    }

    if (startDate || endDate) {
      filter.referralDate = {};
      if (startDate) {
        filter.referralDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.referralDate.$lte = new Date(endDate);
      }
    }

    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      this.referralModel
        .find(filter)
        .populate('partnerId', 'companyName contactName email')
        .populate('customerId', 'firstName lastName email phone')
        .populate('opportunityId', 'status estimatedPrice')
        .populate('jobId', 'status totalCost')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.referralModel.countDocuments(filter)
    ]);

    return { referrals, total, page, limit };
  }

  /**
   * Find referral by ID
   */
  async findById(referralId: string): Promise<ReferralDocument> {
    const referral = await this.referralModel
      .findById(referralId)
      .populate('partnerId', 'companyName contactName email commissionStructure')
      .populate('customerId', 'firstName lastName email phone')
      .populate('opportunityId')
      .populate('jobId');

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }

  /**
   * Find referrals by partner ID
   */
  async findByPartner(partnerId: string, query?: Partial<ReferralQueryDto>): Promise<ReferralDocument[]> {
    const filter: any = { partnerId: new Types.ObjectId(partnerId) };

    if (query?.status) {
      filter.status = query.status;
    }

    return this.referralModel
      .find(filter)
      .populate('customerId', 'firstName lastName email phone')
      .populate('opportunityId', 'status estimatedPrice')
      .populate('jobId', 'status totalCost')
      .sort({ referralDate: -1 })
      .exec();
  }

  /**
   * Find referrals with pending commissions
   */
  async findPendingCommissions(): Promise<ReferralDocument[]> {
    return this.referralModel
      .find({
        status: 'won',
        'commissionDetails.isPaid': false,
        'commissionDetails.commissionAmount': { $gt: 0 }
      })
      .populate('partnerId', 'companyName contactName email commissionStructure')
      .populate('jobId', 'status totalCost')
      .sort({ 'commissionDetails.finalJobValue': -1 })
      .exec();
  }

  /**
   * Update referral information
   */
  async update(referralId: string, updateReferralDto: UpdateReferralDto): Promise<ReferralDocument> {
    const referral = await this.referralModel.findByIdAndUpdate(
      referralId,
      { $set: updateReferralDto },
      { new: true, runValidators: true }
    );

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }

  /**
   * Update referral status with conversion tracking
   */
  async updateStatus(referralId: string, updateStatusDto: UpdateReferralStatusDto): Promise<ReferralDocument> {
    const referral = await this.findById(referralId);

    referral.status = updateStatusDto.status;

    // Calculate conversion metrics
    const now = new Date();
    const referralDate = new Date(referral.referralDate);
    const daysSinceReferral = Math.ceil((now.getTime() - referralDate.getTime()) / (1000 * 60 * 60 * 24));

    // Track days to contact (when first contacted)
    if (updateStatusDto.status === 'contacted' && !referral.conversionData.daysToContact) {
      referral.conversionData.daysToContact = daysSinceReferral;
    }

    // Track days to quote (when quoted)
    if (updateStatusDto.status === 'quoted' && !referral.conversionData.daysToQuote) {
      referral.conversionData.daysToQuote = daysSinceReferral;
    }

    // Track days to conversion (when won)
    if (updateStatusDto.status === 'won' && !referral.conversionData.daysToConversion) {
      referral.conversionData.daysToConversion = daysSinceReferral;
    }

    // Track lost reason
    if (updateStatusDto.status === 'lost' && updateStatusDto.lostReason) {
      referral.conversionData.lostReason = updateStatusDto.lostReason;
    }

    // Add notes if provided
    if (updateStatusDto.notes) {
      referral.notes = updateStatusDto.notes;
    }

    await referral.save();

    return referral;
  }

  /**
   * Convert referral to job
   */
  async convertToJob(referralId: string, jobId: string, jobValue: number): Promise<ReferralDocument> {
    const referral = await this.findById(referralId);

    // Update referral status to won
    referral.status = 'won';
    referral.jobId = new Types.ObjectId(jobId);

    // Calculate conversion time
    const now = new Date();
    const referralDate = new Date(referral.referralDate);
    const daysToConversion = Math.ceil((now.getTime() - referralDate.getTime()) / (1000 * 60 * 60 * 24));
    referral.conversionData.daysToConversion = daysToConversion;

    // Calculate commission
    const partner = await this.partnersService.findById(referral.partnerId.toString());
    const commissionAmount = this.partnersService.calculateCommission(partner, jobValue);

    referral.commissionDetails = {
      commissionRate: partner.commissionStructure.rate || 0,
      commissionAmount,
      finalJobValue: jobValue,
      isPaid: false
    };

    await referral.save();

    // Update partner statistics
    await this.partnersService.recordLeadConversion(referral.partnerId.toString(), jobValue);

    return referral;
  }

  /**
   * Link referral to opportunity
   */
  async linkToOpportunity(referralId: string, opportunityId: string): Promise<ReferralDocument> {
    const referral = await this.referralModel.findByIdAndUpdate(
      referralId,
      { $set: { opportunityId: new Types.ObjectId(opportunityId) } },
      { new: true }
    );

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }

  /**
   * Link referral to customer
   */
  async linkToCustomer(referralId: string, customerId: string): Promise<ReferralDocument> {
    const referral = await this.referralModel.findByIdAndUpdate(
      referralId,
      { $set: { customerId: new Types.ObjectId(customerId) } },
      { new: true }
    );

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }

  /**
   * Mark commission as paid
   */
  async markCommissionPaid(referralId: string, markPaidDto: MarkCommissionPaidDto): Promise<ReferralDocument> {
    const referral = await this.findById(referralId);

    if (referral.status !== 'won') {
      throw new BadRequestException('Commission can only be paid for won referrals');
    }

    if (referral.commissionDetails.isPaid) {
      throw new BadRequestException('Commission has already been paid');
    }

    const paidAmount = markPaidDto.paidAmount || referral.commissionDetails.commissionAmount;

    referral.commissionDetails = {
      ...referral.commissionDetails,
      isPaid: true,
      paidDate: markPaidDto.paidDate ? new Date(markPaidDto.paidDate) : new Date(),
      paymentMethod: markPaidDto.paymentMethod || 'check',
      paymentReference: markPaidDto.paymentReference
    };

    await referral.save();

    // Update partner's total commissions paid
    await this.partnersService.recordCommissionPayment(referral.partnerId.toString(), paidAmount);

    return referral;
  }

  /**
   * Get referral statistics
   */
  async getStatistics(partnerId?: string, startDate?: string, endDate?: string): Promise<any> {
    const filter: any = {};

    if (partnerId) {
      filter.partnerId = new Types.ObjectId(partnerId);
    }

    if (startDate || endDate) {
      filter.referralDate = {};
      if (startDate) {
        filter.referralDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.referralDate.$lte = new Date(endDate);
      }
    }

    const [
      totalReferrals,
      statusBreakdown,
      qualityBreakdown,
      conversionStats,
      commissionStats
    ] = await Promise.all([
      this.referralModel.countDocuments(filter),
      this.referralModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.referralModel.aggregate([
        { $match: filter },
        { $group: { _id: '$leadQuality', count: { $sum: 1 } } }
      ]),
      this.referralModel.aggregate([
        { $match: { ...filter, status: 'won' } },
        {
          $group: {
            _id: null,
            avgDaysToContact: { $avg: '$conversionData.daysToContact' },
            avgDaysToQuote: { $avg: '$conversionData.daysToQuote' },
            avgDaysToConversion: { $avg: '$conversionData.daysToConversion' }
          }
        }
      ]),
      this.referralModel.aggregate([
        { $match: { ...filter, status: 'won' } },
        {
          $group: {
            _id: null,
            totalCommissions: { $sum: '$commissionDetails.commissionAmount' },
            paidCommissions: {
              $sum: {
                $cond: ['$commissionDetails.isPaid', '$commissionDetails.commissionAmount', 0]
              }
            },
            unpaidCommissions: {
              $sum: {
                $cond: ['$commissionDetails.isPaid', 0, '$commissionDetails.commissionAmount']
              }
            },
            totalJobValue: { $sum: '$commissionDetails.finalJobValue' }
          }
        }
      ])
    ]);

    return {
      totalReferrals,
      statusBreakdown: statusBreakdown.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      qualityBreakdown: qualityBreakdown.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      conversionMetrics: conversionStats[0] || {
        avgDaysToContact: 0,
        avgDaysToQuote: 0,
        avgDaysToConversion: 0
      },
      commissionMetrics: commissionStats[0] || {
        totalCommissions: 0,
        paidCommissions: 0,
        unpaidCommissions: 0,
        totalJobValue: 0
      }
    };
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(partnerId?: string, startDate?: string, endDate?: string): Promise<any> {
    const filter: any = {};

    if (partnerId) {
      filter.partnerId = new Types.ObjectId(partnerId);
    }

    if (startDate || endDate) {
      filter.referralDate = {};
      if (startDate) {
        filter.referralDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.referralDate.$lte = new Date(endDate);
      }
    }

    const funnelData = await this.referralModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          received: { $sum: 1 },
          contacted: {
            $sum: {
              $cond: [{ $in: ['$status', ['contacted', 'qualified', 'quoted', 'won']] }, 1, 0]
            }
          },
          qualified: {
            $sum: {
              $cond: [{ $in: ['$status', ['qualified', 'quoted', 'won']] }, 1, 0]
            }
          },
          quoted: {
            $sum: {
              $cond: [{ $in: ['$status', ['quoted', 'won']] }, 1, 0]
            }
          },
          won: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (funnelData.length === 0) {
      return {
        received: 0,
        contacted: 0,
        qualified: 0,
        quoted: 0,
        won: 0,
        conversionRate: 0
      };
    }

    const data = funnelData[0];
    return {
      ...data,
      conversionRate: data.received > 0 ? (data.won / data.received) * 100 : 0
    };
  }
}
