import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteHistoryService } from './quote-history.service';
import {
  CreateQuoteHistoryDto,
  UpdateQuoteStatusDto,
  AddInteractionDto,
  AddSalesActivityDto,
  CreateRevisionDto,
  MarkWonDto,
  MarkLostDto,
  DateRangeDto,
} from './dto/create-quote-history.dto';

@Controller('api/quote-history')
@UseGuards(JwtAuthGuard)
export class QuoteHistoryController {
  constructor(private readonly quoteHistoryService: QuoteHistoryService) {}

  @Post()
  async createQuoteHistory(@Body() dto: CreateQuoteHistoryDto) {
    const quoteHistory = await this.quoteHistoryService.createQuoteHistory(dto);
    return {
      success: true,
      quoteHistory,
    };
  }

  @Get('customer/:customerId')
  async getCustomerQuotes(@Param('customerId') customerId: string) {
    const quotes = await this.quoteHistoryService.getQuotesByCustomer(
      customerId,
    );
    return {
      success: true,
      quotes,
      count: quotes.length,
    };
  }

  @Get('opportunity/:opportunityId')
  async getOpportunityQuotes(@Param('opportunityId') opportunityId: string) {
    const quotes = await this.quoteHistoryService.getQuotesByOpportunity(
      opportunityId,
    );
    return {
      success: true,
      quotes,
      count: quotes.length,
    };
  }

  @Get('sales-rep/:salesRepId')
  async getSalesRepQuotes(
    @Param('salesRepId') salesRepId: string,
    @Query('status') status?: string,
  ) {
    const quotes = await this.quoteHistoryService.getQuotesBySalesRep(
      salesRepId,
      status,
    );
    return {
      success: true,
      quotes,
      count: quotes.length,
    };
  }

  @Get('pending')
  async getPendingQuotes() {
    const quotes = await this.quoteHistoryService.getPendingQuotes();
    return {
      success: true,
      quotes,
      count: quotes.length,
    };
  }

  @Get('expired')
  async getExpiredQuotes() {
    const quotes = await this.quoteHistoryService.getExpiredQuotes();
    return {
      success: true,
      quotes,
      count: quotes.length,
    };
  }

  @Get(':id')
  async getQuoteHistory(@Param('id') id: string) {
    const quoteHistory = await this.quoteHistoryService.findById(id);
    return {
      success: true,
      quoteHistory,
    };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateQuoteStatusDto) {
    const quoteHistory = await this.quoteHistoryService.updateQuoteStatus(
      id,
      dto,
    );
    return {
      success: true,
      quoteHistory,
    };
  }

  @Post(':id/interaction')
  async addInteraction(
    @Param('id') id: string,
    @Body() dto: AddInteractionDto,
  ) {
    const quoteHistory = await this.quoteHistoryService.addCustomerInteraction(
      id,
      dto,
    );
    return {
      success: true,
      quoteHistory,
    };
  }

  @Post(':id/activity')
  async addSalesActivity(
    @Param('id') id: string,
    @Body() dto: AddSalesActivityDto,
  ) {
    const quoteHistory = await this.quoteHistoryService.addSalesActivity(
      id,
      dto,
    );
    return {
      success: true,
      quoteHistory,
    };
  }

  @Post(':id/revision')
  async createRevision(
    @Param('id') id: string,
    @Body() dto: CreateRevisionDto,
  ) {
    const quoteHistory = await this.quoteHistoryService.recordQuoteRevision(
      id,
      dto,
    );
    return {
      success: true,
      quoteHistory,
    };
  }

  @Post(':id/mark-won')
  async markWon(@Param('id') id: string, @Body() dto: MarkWonDto) {
    const quoteHistory = await this.quoteHistoryService.markAsWon(id, dto);
    return {
      success: true,
      quoteHistory,
    };
  }

  @Post(':id/mark-lost')
  async markLost(@Param('id') id: string, @Body() dto: MarkLostDto) {
    const quoteHistory = await this.quoteHistoryService.markAsLost(id, dto);
    return {
      success: true,
      quoteHistory,
    };
  }

  @Get('analytics/win-loss-reasons')
  async getWinLossReasons(@Query() dto: DateRangeDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const analysis = await this.quoteHistoryService.getWinLossReasons(
      startDate,
      endDate,
    );

    return {
      success: true,
      analysis,
    };
  }

  @Get('analytics/conversion-by-price')
  async getConversionByPrice(@Query() dto: DateRangeDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const data = await this.quoteHistoryService.getConversionRateByPriceRange(
      startDate,
      endDate,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('analytics/avg-days-to-decision')
  async getAvgDaysToDecision(@Query() dto: DateRangeDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const avgDays = await this.quoteHistoryService.getAvgDaysToDecision(
      startDate,
      endDate,
    );

    return {
      success: true,
      avgDays,
    };
  }
}
