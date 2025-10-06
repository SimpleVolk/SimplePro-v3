import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsArray,
} from 'class-validator';
import { QuoteStatus } from '../schemas/quote-history.schema';

export class CreateQuoteHistoryDto {
  @IsString()
  @IsNotEmpty()
  estimateId!: string;

  @IsString()
  @IsNotEmpty()
  opportunityId!: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  @IsNotEmpty()
  quoteNumber!: string;

  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @IsObject()
  @IsNotEmpty()
  quoteData!: {
    totalPrice: number;
    breakdown?: Record<string, any>;
    validUntil?: Date;
    terms?: string;
    notes?: string;
  };

  @IsString()
  @IsOptional()
  assignedSalesRep?: string;

  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}

export class UpdateQuoteStatusDto {
  @IsEnum(QuoteStatus)
  @IsNotEmpty()
  status!: QuoteStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddInteractionDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsObject()
  @IsOptional()
  details?: Record<string, any>;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class AddSalesActivityDto {
  @IsString()
  @IsNotEmpty()
  activityType!: string;

  @IsString()
  @IsNotEmpty()
  performedBy!: string;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateRevisionDto {
  @IsString()
  @IsNotEmpty()
  revisedBy!: string;

  @IsNumber()
  @IsNotEmpty()
  priceChange!: number;

  @IsString()
  @IsNotEmpty()
  changeReason!: string;

  @IsString()
  @IsOptional()
  changesDescription?: string;

  @IsObject()
  @IsNotEmpty()
  newQuoteData!: {
    totalPrice: number;
    breakdown?: Record<string, any>;
    validUntil?: Date;
    terms?: string;
    notes?: string;
  };
}

export class MarkWonDto {
  @IsString()
  @IsNotEmpty()
  winReason!: string;

  @IsString()
  @IsOptional()
  winReasonDetails?: string;

  @IsArray()
  @IsOptional()
  keySellingPoints?: string[];

  @IsNumber()
  @IsOptional()
  marginAchieved?: number;

  @IsArray()
  @IsOptional()
  upsellOpportunities?: string[];
}

export class MarkLostDto {
  @IsString()
  @IsNotEmpty()
  lostReason!: string;

  @IsString()
  @IsOptional()
  lostReasonDetails?: string;

  @IsString()
  @IsOptional()
  competitorWon?: string;

  @IsNumber()
  @IsOptional()
  priceDifference?: number;

  @IsString()
  @IsOptional()
  lessonsLearned?: string;

  @IsDateString()
  @IsOptional()
  followUpScheduled?: string;
}

export class DateRangeDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}
