import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  QuoteHistory,
  QuoteHistorySchema,
} from './schemas/quote-history.schema';
import { QuoteHistoryService } from './quote-history.service';
import { QuoteHistoryController } from './quote-history.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuoteHistory.name, schema: QuoteHistorySchema },
    ]),
  ],
  controllers: [QuoteHistoryController],
  providers: [QuoteHistoryService],
  exports: [QuoteHistoryService],
})
export class QuoteHistoryModule {}
