/**
 * Inventory Types
 *
 * Type definitions for inventory checklist system
 */

export type ItemCondition = 'excellent' | 'good' | 'fair' | 'damaged';
export type ItemStatus = 'not_started' | 'loaded' | 'delivered';

export interface InventoryItemPhoto {
  photoId?: string;
  uri: string;
  fileName: string;
  uploadedAt?: string;
  uploaded?: boolean;
}

export interface InventoryItem {
  itemId: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  condition: ItemCondition;
  status: ItemStatus;
  notes?: string;
  specialHandling?: string;
  photos: InventoryItemPhoto[];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryChecklist {
  checklistId: string;
  jobId: string;
  items: InventoryItem[];
  totalItems: number;
  loadedItems: number;
  deliveredItems: number;
  damagedItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDto {
  name: string;
  description?: string;
  category: string;
  quantity: number;
  condition?: ItemCondition;
  notes?: string;
  specialHandling?: string;
}

export interface UpdateInventoryItemDto {
  quantity?: number;
  condition?: ItemCondition;
  status?: ItemStatus;
  notes?: string;
  specialHandling?: string;
}

export const ITEM_CATEGORIES = {
  FURNITURE: 'Furniture',
  APPLIANCES: 'Appliances',
  BOXES_KITCHEN: 'Boxes - Kitchen',
  BOXES_BEDROOM: 'Boxes - Bedroom',
  BOXES_LIVING_ROOM: 'Boxes - Living Room',
  BOXES_BATHROOM: 'Boxes - Bathroom',
  BOXES_OFFICE: 'Boxes - Office',
  BOXES_GARAGE: 'Boxes - Garage',
  FRAGILE: 'Fragile Items',
  OUTDOOR: 'Outdoor Items',
  CUSTOM: 'Custom',
} as const;

export const PRESET_ITEMS: Omit<InventoryItem, 'itemId' | 'status' | 'photos' | 'createdAt' | 'updatedAt'>[] = [
  // Furniture
  { name: 'Sofa', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Loveseat', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Recliner', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Coffee Table', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'End Table', category: ITEM_CATEGORIES.FURNITURE, quantity: 2, condition: 'good', isCustom: false },
  { name: 'TV Stand', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Bookshelf', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Dining Table', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Dining Chairs', category: ITEM_CATEGORIES.FURNITURE, quantity: 4, condition: 'good', isCustom: false },
  { name: 'Queen Bed Frame', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'King Bed Frame', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Dresser', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Nightstand', category: ITEM_CATEGORIES.FURNITURE, quantity: 2, condition: 'good', isCustom: false },
  { name: 'Desk', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Office Chair', category: ITEM_CATEGORIES.FURNITURE, quantity: 1, condition: 'good', isCustom: false },

  // Appliances
  { name: 'Refrigerator', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Washing Machine', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Dryer', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Dishwasher', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },
  { name: 'Microwave', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },
  { name: 'TV (55")', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },
  { name: 'TV (65"+)', category: ITEM_CATEGORIES.APPLIANCES, quantity: 1, condition: 'good', isCustom: false },

  // Boxes - Kitchen
  { name: 'Kitchen Box (Small)', category: ITEM_CATEGORIES.BOXES_KITCHEN, quantity: 5, condition: 'good', isCustom: false },
  { name: 'Kitchen Box (Medium)', category: ITEM_CATEGORIES.BOXES_KITCHEN, quantity: 5, condition: 'good', isCustom: false },
  { name: 'Dish Pack', category: ITEM_CATEGORIES.BOXES_KITCHEN, quantity: 3, condition: 'good', isCustom: false },

  // Boxes - Bedroom
  { name: 'Bedroom Box (Small)', category: ITEM_CATEGORIES.BOXES_BEDROOM, quantity: 3, condition: 'good', isCustom: false },
  { name: 'Bedroom Box (Medium)', category: ITEM_CATEGORIES.BOXES_BEDROOM, quantity: 3, condition: 'good', isCustom: false },
  { name: 'Wardrobe Box', category: ITEM_CATEGORIES.BOXES_BEDROOM, quantity: 2, condition: 'good', isCustom: false },

  // Boxes - Living Room
  { name: 'Living Room Box (Medium)', category: ITEM_CATEGORIES.BOXES_LIVING_ROOM, quantity: 5, condition: 'good', isCustom: false },
  { name: 'Living Room Box (Large)', category: ITEM_CATEGORIES.BOXES_LIVING_ROOM, quantity: 3, condition: 'good', isCustom: false },

  // Boxes - Other
  { name: 'Bathroom Box (Small)', category: ITEM_CATEGORIES.BOXES_BATHROOM, quantity: 2, condition: 'good', isCustom: false },
  { name: 'Office Box (Medium)', category: ITEM_CATEGORIES.BOXES_OFFICE, quantity: 3, condition: 'good', isCustom: false },
  { name: 'Garage Box (Large)', category: ITEM_CATEGORIES.BOXES_GARAGE, quantity: 5, condition: 'good', isCustom: false },
];
