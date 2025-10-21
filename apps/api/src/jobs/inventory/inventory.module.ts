import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  InventoryChecklist,
  InventoryChecklistSchema,
} from './schemas/inventory-checklist.schema';
import {
  InventoryItem,
  InventoryItemSchema,
} from './schemas/inventory-item.schema';
import { DocumentsModule } from '../../documents/documents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryChecklist.name, schema: InventoryChecklistSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
    ]),
    forwardRef(() => DocumentsModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
