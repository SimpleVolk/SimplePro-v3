import { IsArray, IsEnum, IsMongoId } from 'class-validator';
import { ItemStatus } from '../schemas/inventory-item.schema';

export class BulkUpdateStatusDto {
  @IsArray()
  @IsMongoId({ each: true })
  itemIds!: string[];

  @IsEnum(ItemStatus)
  newStatus!: ItemStatus;
}
