import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  QuoteHistory,
  QuoteHistoryDocument,
  QuoteStatus,
} from './schemas/quote-history.schema';
import {
  CreateQuoteHistoryDto,
  UpdateQuoteStatusDto,
  AddInteractionDto,
  AddSalesActivityDto,
  CreateRevisionDto,
  MarkWonDto,
  MarkLostDto,
} from './dto/create-quote-history.dto';

@Injectable()
export class QuoteHistoryService {
  constructor(
    @InjectModel(QuoteHistory.name)
    private quoteHistoryModel: Model<QuoteHistoryDocument>,
  ) {}

  // CRUD operations
  async createQuoteHistory(
    dto: CreateQuoteHistoryDto,
  ): Promise<QuoteHistory> {
    const quoteHistoryId = uuidv4();

    const quoteHistory = new this.quoteHistoryModel({
      quoteHistoryId,
      ...dto,
      status: dto.status || QuoteStatus.DRAFT,
      version: dto.version || 1,
      timeline: {
        quoteSentDate: dto.status === QuoteStatus.SENT ? new Date() : null,
        totalViewCount: 0,
      },
    });

    return quoteHistory.save();
  }

  async findById(quoteHistoryId: string): Promise<QuoteHistory> {
    const quote = await this.quoteHistoryModel
      .findOne({ quoteHistoryId })
      .exec();

    if (!quote) {
      throw new NotFoundException(
        `Quote history with ID ${quoteHistoryId} not found`,
      );
    }

    return quote;
  }

  async getByEstimateId(estimateId: string): Promise<QuoteHistory> {
    const quote = await this.quoteHistoryModel.findOne({ estimateId }).exec();

    if (!quote) {
      throw new NotFoundException(
        `Quote history for estimate ${estimateId} not found`,
      );
    }

    return quote;
  }

  async updateQuoteStatus(
    quoteHistoryId: string,
    dto: UpdateQuoteStatusDto,
  ): Promise<QuoteHistory> {
    const quote = await this.findById(quoteHistoryId);

    quote.status = dto.status;

    // Update timeline based on status
    if (dto.status === QuoteStatus.SENT && !quote.timeline.quoteSentDate) {
      quote.timeline.quoteSentDate = new Date();
    }

    if (
      (dto.status === QuoteStatus.ACCEPTED ||
        dto.status === QuoteStatus.REJECTED) &&
      !quote.timeline.decisionDate
    ) {
      quote.timeline.decisionDate = new Date();

      // Calculate days to decision
      if (quote.timeline.quoteSentDate) {
        const sentDate = new Date(quote.timeline.quoteSentDate);
        const decisionDate = new Date(quote.timeline.decisionDate);
        quote.timeline.daysToDecision = Math.ceil(
          (decisionDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    }

    quote.updatedAt = new Date();
    return quote.save();
  }

  async addCustomerInteraction(
    quoteHistoryId: string,
    dto: AddInteractionDto,
  ): Promise<QuoteHistory> {
    const quote = await this.findById(quoteHistoryId);

    const interaction = {
      type: dto.type as any,
      timestamp: new Date(),
      details: dto.details || {},
      userId: dto.userId,
    };

    quote.customerInteractions.push(interaction);

    // Update timeline for viewed interactions
    if (dto.type === 'viewed') {
      quote.timeline.totalViewCount += 1;
      quote.timeline.lastViewedDate = new Date();

      if (!quote.timeline.firstViewedDate) {
        quote.timeline.firstViewedDate = new Date();

        // Calculate days to first view
        if (quote.timeline.quoteSentDate) {
          const sentDate = new Date(quote.timeline.quoteSentDate);
          const viewedDate = new Date(quote.timeline.firstViewedDate);
          quote.timeline.daysToFirstView = Math.ceil(
            (viewedDate.getTime() - sentDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
        }
      }
    }

    quote.updatedAt = new Date();
    return quote.save();
  }

  async addSalesActivity(
    quoteHistoryId: string,
    dto: AddSalesActivityDto,
  ): Promise<QuoteHistory> {
    const quote = await this.findById(quoteHistoryId);

    const activity = {
      activityType: dto.activityType as any,
      timestamp: new Date(),
      performedBy: dto.performedBy,
      outcome: dto.outcome,
      notes: dto.notes,
    };

    quote.salesActivity.push(activity);

    // Track follow-up dates
    if (dto.activityType === 'follow_up_call') {
      quote.timeline.followUpDates.push(new Date());
    }

    quote.updatedAt = new Date();
    return quote.save();
  }

  async recordQuoteRevision(
    quoteHistoryId: string,
    dto: CreateRevisionDto,
  ): Promise<QuoteHistory> {
    const quote = await this.findById(quoteHistoryId);

    const newVersion = quote.version + 1;

    const revision = {
      revisionNumber: newVersion,
      revisedDate: new Date(),
      revisedBy: dto.revisedBy,
      priceChange: dto.priceChange,
      changeReason: dto.changeReason,
      changesDescription: dto.changesDescription,
    };

    quote.revisionHistory.push(revision);
    quote.version = newVersion;
    quote.quoteData = dto.newQuoteData as any;
    quote.status = QuoteStatus.REVISED;
    quote.updatedAt = new Date();

    return quote.save();
  }

  // Win/Loss analysis
  async markAsWon(
    quoteHistoryId: string,
    dto: MarkWonDto,
  ): Promise<QuoteHistory> {
    const quote = await this.findById(quoteHistoryId);

    quote.status = QuoteStatus.ACCEPTED;
    quote.winAnalysis = {
      winReason: dto.winReason as any,
      winReasonDetails: dto.winReasonDetails,
      keySellingPoints: dto.keySellingPoints || [],
      marginAchieved: dto.marginAchieved,
      upsellOpportunities: dto.upsellOpportunities || [],
    };

    if (!quote.timeline.decisionDate) {
      quote.timeline.decisionDate = new Date();

      if (quote.timeline.quoteSentDate) {
        const sentDate = new Date(quote.timeline.quoteSentDate);
        const decisionDate = new Date(quote.timeline.decisionDate);
        quote.timeline.daysToDecision = Math.ceil(
          (decisionDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    }

    quote.updatedAt = new Date();
    return quote.save();
  }

  async markAsLost(
    quoteHistoryId: string,
    dto: MarkLostDto,
  ): Promise<QuoteHistory> {
    const quote = await this.findById(quoteHistoryId);

    quote.status = QuoteStatus.REJECTED;
    quote.lossAnalysis = {
      lostReason: dto.lostReason as any,
      lostReasonDetails: dto.lostReasonDetails,
      competitorWon: dto.competitorWon,
      priceDifference: dto.priceDifference,
      lessonsLearned: dto.lessonsLearned,
      followUpScheduled: dto.followUpScheduled
        ? new Date(dto.followUpScheduled)
        : null,
    };

    if (!quote.timeline.decisionDate) {
      quote.timeline.decisionDate = new Date();

      if (quote.timeline.quoteSentDate) {
        const sentDate = new Date(quote.timeline.quoteSentDate);
        const decisionDate = new Date(quote.timeline.decisionDate);
        quote.timeline.daysToDecision = Math.ceil(
          (decisionDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    }

    quote.updatedAt = new Date();
    return quote.save();
  }

  // Query methods
  async getQuotesByCustomer(customerId: string): Promise<QuoteHistory[]> {
    return this.quoteHistoryModel
      .find({ customerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getQuotesByOpportunity(opportunityId: string): Promise<QuoteHistory[]> {
    return this.quoteHistoryModel
      .find({ opportunityId })
      .sort({ version: -1 })
      .exec();
  }

  async getQuotesBySalesRep(
    salesRepId: string,
    status?: string,
  ): Promise<QuoteHistory[]> {
    const filter: any = { assignedSalesRep: salesRepId };
    if (status) {
      filter.status = status;
    }

    return this.quoteHistoryModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getPendingQuotes(): Promise<QuoteHistory[]> {
    return this.quoteHistoryModel
      .find({
        status: { $in: [QuoteStatus.SENT, QuoteStatus.VIEWED] },
      })
      .sort({ 'timeline.quoteSentDate': -1 })
      .exec();
  }

  async getExpiredQuotes(): Promise<QuoteHistory[]> {
    const now = new Date();

    return this.quoteHistoryModel
      .find({
        'quoteData.validUntil': { $lt: now },
        status: { $in: [QuoteStatus.SENT, QuoteStatus.VIEWED] },
      })
      .exec();
  }

  // Analytics
  async getConversionRateByPriceRange(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const quotes = await this.quoteHistoryModel
      .find({
        'timeline.quoteSentDate': { $gte: startDate, $lte: endDate },
      })
      .exec();

    const priceRanges = [
      { min: 0, max: 500, name: '$0-$500' },
      { min: 500, max: 1000, name: '$500-$1000' },
      { min: 1000, max: 2500, name: '$1000-$2500' },
      { min: 2500, max: 5000, name: '$2500-$5000' },
      { min: 5000, max: Infinity, name: '$5000+' },
    ];

    const results = priceRanges.map((range) => {
      const rangeQuotes = quotes.filter(
        (q) =>
          q.quoteData.totalPrice >= range.min &&
          q.quoteData.totalPrice < range.max,
      );

      const won = rangeQuotes.filter(
        (q) => q.status === QuoteStatus.ACCEPTED,
      ).length;
      const total = rangeQuotes.length;

      return {
        priceRange: range.name,
        totalQuotes: total,
        quotesWon: won,
        conversionRate: total > 0 ? (won / total) * 100 : 0,
      };
    });

    return results;
  }

  async getAvgDaysToDecision(startDate: Date, endDate: Date): Promise<number> {
    const quotes = await this.quoteHistoryModel
      .find({
        'timeline.quoteSentDate': { $gte: startDate, $lte: endDate },
        'timeline.daysToDecision': { $exists: true, $ne: null },
      })
      .exec();

    if (quotes.length === 0) return 0;

    const totalDays = quotes.reduce(
      (sum, q) => sum + (q.timeline.daysToDecision || 0),
      0,
    );

    return totalDays / quotes.length;
  }

  async getWinLossReasons(startDate: Date, endDate: Date): Promise<any> {
    const quotes = await this.quoteHistoryModel
      .find({
        'timeline.quoteSentDate': { $gte: startDate, $lte: endDate },
        status: { $in: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED] },
      })
      .exec();

    const wonQuotes = quotes.filter((q) => q.status === QuoteStatus.ACCEPTED);
    const lostQuotes = quotes.filter((q) => q.status === QuoteStatus.REJECTED);

    // Count win reasons
    const winReasons: Record<string, number> = {};
    wonQuotes.forEach((q) => {
      if (q.winAnalysis?.winReason) {
        winReasons[q.winAnalysis.winReason] =
          (winReasons[q.winAnalysis.winReason] || 0) + 1;
      }
    });

    // Count loss reasons
    const lossReasons: Record<string, number> = {};
    lostQuotes.forEach((q) => {
      if (q.lossAnalysis?.lostReason) {
        lossReasons[q.lossAnalysis.lostReason] =
          (lossReasons[q.lossAnalysis.lostReason] || 0) + 1;
      }
    });

    return {
      totalQuotes: quotes.length,
      quotesWon: wonQuotes.length,
      quotesLost: lostQuotes.length,
      winRate:
        quotes.length > 0 ? (wonQuotes.length / quotes.length) * 100 : 0,
      winReasons: Object.entries(winReasons).map(([reason, count]) => ({
        reason,
        count,
        percentage: wonQuotes.length > 0 ? (count / wonQuotes.length) * 100 : 0,
      })),
      lossReasons: Object.entries(lossReasons).map(([reason, count]) => ({
        reason,
        count,
        percentage:
          lostQuotes.length > 0 ? (count / lostQuotes.length) * 100 : 0,
      })),
    };
  }
}
