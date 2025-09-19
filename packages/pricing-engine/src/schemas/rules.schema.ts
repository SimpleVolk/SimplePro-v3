export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'between' | 'exists' | 'regex';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface RuleAction {
  type: 'add_fixed' | 'add_percentage' | 'multiply' | 'set_minimum' | 'set_maximum' | 'replace';
  amount: number;
  description: string;
  targetField?: string;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  category: 'base_pricing' | 'weight_based' | 'volume_based' | 'distance_based' |
           'location_handicap' | 'difficulty_based' | 'seasonal' | 'promotional' | 'special_items';
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  applicableServices: string[];
  version: string;
  tags?: string[];
}

export interface LocationHandicap {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  multiplier: number;
  fixedAmount?: number;
  isActive: boolean;
}

export interface ServiceRate {
  service: string;
  baseRate: number;
  unit: 'per_pound' | 'per_cubic_foot' | 'per_hour' | 'per_mile' | 'flat_rate';
  minimumCharge: number;
  description: string;
}

export interface EstimateInput {
  // Customer and job details
  customerId: string;
  moveDate: Date;
  service: 'local' | 'long_distance' | 'storage' | 'packing_only';

  // Addresses with access details
  pickup: {
    address: string;
    floorLevel: number;
    elevatorAccess: boolean;
    longCarry: boolean; // >75 feet
    parkingDistance: number; // feet from truck
    accessDifficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
    stairsCount?: number;
    narrowHallways?: boolean;
    specialRequirements?: string[];
  };

  delivery: {
    address: string;
    floorLevel: number;
    elevatorAccess: boolean;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
    stairsCount?: number;
    narrowHallways?: boolean;
    specialRequirements?: string[];
  };

  // Distance and timing
  distance: number; // miles
  estimatedDuration: number; // hours

  // Inventory
  rooms: InventoryRoom[];
  totalWeight: number;
  totalVolume: number; // cubic feet

  // Special items requiring extra care
  specialItems: {
    piano: boolean;
    antiques: boolean;
    artwork: boolean;
    fragileItems: number;
    valuableItems: number;
  };

  // Additional services
  additionalServices: {
    packing: boolean;
    unpacking: boolean;
    assembly: boolean;
    storage: boolean;
    cleaning: boolean;
  };

  // Timing factors
  isWeekend: boolean;
  isHoliday: boolean;
  seasonalPeriod: 'peak' | 'standard' | 'off_peak'; // May-Sep peak, Oct-Apr standard

  // Crew requirements
  crewSize: number;
  specialtyCrewRequired: boolean;
}

export interface InventoryRoom {
  id: string;
  type: string;
  description?: string;
  items: InventoryItem[];
  packingRequired: boolean;
  totalWeight: number;
  totalVolume: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  weight: number;
  volume: number;
  quantity: number;
  fragile: boolean;
  valuable: boolean;
  estimatedValue?: number;
  packingRequired: boolean;
  specialHandling: boolean;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface EstimateResult {
  estimateId: string;
  input: EstimateInput;
  calculations: {
    basePrice: number;
    appliedRules: AppliedRule[];
    locationHandicaps: AppliedLocationHandicap[];
    adjustments: PriceAdjustment[];
    finalPrice: number;
    breakdown: PriceBreakdown;
  };
  metadata: {
    calculatedAt: Date;
    calculatedBy: string;
    rulesVersion: string;
    deterministic: boolean;
    hash: string; // SHA256 of input for reproducibility
  };
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  description: string;
  conditionsMet: boolean;
  priceImpact: number;
  calculationDetails: string;
}

export interface AppliedLocationHandicap {
  handicapId: string;
  name: string;
  description: string;
  type: 'pickup' | 'delivery' | 'both';
  multiplier?: number;
  fixedAmount?: number;
  priceImpact: number;
}

export interface PriceAdjustment {
  type: string;
  description: string;
  amount: number;
  reason: string;
}

export interface PriceBreakdown {
  baseLabor: number;
  materials: number;
  transportation: number;
  locationHandicaps: number;
  specialServices: number;
  seasonalAdjustment: number;
  subtotal: number;
  taxes: number;
  total: number;
}

// JSON Schema for validation
export const PricingRuleJsonSchema = {
  type: "object",
  required: ["id", "name", "category", "priority", "conditions", "actions", "isActive", "applicableServices", "version"],
  properties: {
    id: { type: "string" },
    name: { type: "string", minLength: 1, maxLength: 100 },
    description: { type: "string", maxLength: 500 },
    category: {
      type: "string",
      enum: ["base_pricing", "weight_based", "volume_based", "distance_based",
             "location_handicap", "difficulty_based", "seasonal", "promotional", "special_items"]
    },
    priority: { type: "number", minimum: 0, maximum: 100 },
    conditions: {
      type: "array",
      items: {
        type: "object",
        required: ["field", "operator", "value"],
        properties: {
          field: { type: "string" },
          operator: {
            type: "string",
            enum: ["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "between", "exists", "regex"]
          },
          value: {},
          logicalOperator: { type: "string", enum: ["and", "or"] }
        }
      }
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "amount", "description"],
        properties: {
          type: {
            type: "string",
            enum: ["add_fixed", "add_percentage", "multiply", "set_minimum", "set_maximum", "replace"]
          },
          amount: { type: "number" },
          description: { type: "string" },
          targetField: { type: "string" }
        }
      }
    },
    isActive: { type: "boolean" },
    effectiveFrom: { type: "string", format: "date-time" },
    effectiveTo: { type: "string", format: "date-time" },
    applicableServices: {
      type: "array",
      items: { type: "string" }
    },
    version: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" }
    }
  }
} as const;