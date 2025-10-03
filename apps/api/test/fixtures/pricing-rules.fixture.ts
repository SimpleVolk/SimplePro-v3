/**
 * Pricing Rules Test Fixtures
 *
 * Provides realistic test data for pricing rules service testing.
 */

import { CreatePricingRuleDto } from '../../src/pricing-rules/dto/pricing-rules.dto';

/**
 * Base pricing rule
 */
export const basePricingRule: CreatePricingRuleDto = {
  id: 'rule_weekend_surcharge',
  name: 'Weekend Surcharge',
  description: 'Apply 15% surcharge for weekend moves',
  category: 'timing',
  priority: 100,
  conditions: [
    {
      field: 'isWeekend',
      operator: 'eq',
      value: true,
    },
  ],
  actions: [
    {
      type: 'add_percentage',
      amount: 15,
      description: 'Weekend surcharge',
      targetField: 'totalPrice',
    },
  ],
  isActive: true,
  applicableServices: ['local', 'long_distance'],
  version: '1.0.0',
};

/**
 * Weight-based rule
 */
export const weightBasedRule: CreatePricingRuleDto = {
  id: 'rule_heavy_items',
  name: 'Heavy Items Surcharge',
  description: 'Add $200 for moves over 5000 lbs',
  category: 'weight_volume',
  priority: 200,
  conditions: [
    {
      field: 'totalWeight',
      operator: 'gt',
      value: 5000,
    },
  ],
  actions: [
    {
      type: 'add_fixed',
      amount: 200,
      description: 'Heavy load surcharge',
      targetField: 'totalPrice',
    },
  ],
  isActive: true,
  applicableServices: ['local', 'long_distance'],
  version: '1.0.0',
};

/**
 * Distance-based rule
 */
export const distanceBasedRule: CreatePricingRuleDto = {
  id: 'rule_long_distance',
  name: 'Long Distance Rate',
  description: 'Apply $2 per mile for distances over 50 miles',
  category: 'distance',
  priority: 300,
  conditions: [
    {
      field: 'distance',
      operator: 'gt',
      value: 50,
    },
  ],
  actions: [
    {
      type: 'multiply',
      amount: 2,
      description: 'Long distance rate',
      targetField: 'distance',
    },
  ],
  isActive: true,
  applicableServices: ['long_distance'],
  version: '1.0.0',
};

/**
 * Special items rule
 */
export const specialItemsRule: CreatePricingRuleDto = {
  id: 'rule_piano',
  name: 'Piano Handling Fee',
  description: 'Add $250 for piano transport',
  category: 'special_items',
  priority: 400,
  conditions: [
    {
      field: 'specialItems.piano',
      operator: 'eq',
      value: true,
    },
  ],
  actions: [
    {
      type: 'add_fixed',
      amount: 250,
      description: 'Piano handling fee',
      targetField: 'totalPrice',
    },
  ],
  isActive: true,
  applicableServices: ['local', 'long_distance'],
  version: '1.0.0',
};

/**
 * Seasonal pricing rule
 */
export const seasonalRule: CreatePricingRuleDto = {
  id: 'rule_peak_season',
  name: 'Peak Season Surcharge',
  description: 'Apply 20% surcharge during peak moving season',
  category: 'timing',
  priority: 150,
  conditions: [
    {
      field: 'seasonalPeriod',
      operator: 'eq',
      value: 'peak',
    },
  ],
  actions: [
    {
      type: 'add_percentage',
      amount: 20,
      description: 'Peak season surcharge',
      targetField: 'totalPrice',
    },
  ],
  isActive: true,
  applicableServices: ['local', 'long_distance', 'storage'],
  version: '1.0.0',
};

/**
 * Stairs handicap rule
 */
export const stairsHandicapRule: CreatePricingRuleDto = {
  id: 'rule_stairs',
  name: 'Stairs Surcharge',
  description: 'Add $10 per flight of stairs',
  category: 'location_handicaps',
  priority: 500,
  conditions: [
    {
      field: 'pickup.stairsCount',
      operator: 'gt',
      value: 0,
    },
  ],
  actions: [
    {
      type: 'multiply',
      amount: 10,
      description: 'Stairs surcharge',
      targetField: 'pickup.stairsCount',
    },
  ],
  isActive: true,
  applicableServices: ['local', 'long_distance'],
  version: '1.0.0',
};

/**
 * Crew size rule
 */
export const crewSizeRule: CreatePricingRuleDto = {
  id: 'rule_crew_size',
  name: 'Large Crew Discount',
  description: 'Apply 5% discount for 4+ crew members',
  category: 'crew_adjustments',
  priority: 250,
  conditions: [
    {
      field: 'crewSize',
      operator: 'gte',
      value: 4,
    },
  ],
  actions: [
    {
      type: 'subtract_percentage',
      amount: 5,
      description: 'Large crew efficiency discount',
      targetField: 'totalPrice',
    },
  ],
  isActive: true,
  applicableServices: ['local'],
  version: '1.0.0',
};

/**
 * Inactive rule
 */
export const inactiveRule: CreatePricingRuleDto = {
  ...basePricingRule,
  id: 'rule_inactive',
  name: 'Inactive Rule',
  isActive: false,
};

/**
 * Invalid rule (missing required fields)
 */
export const invalidRule: any = {
  id: 'rule_invalid',
  // Missing name
  description: 'Invalid rule',
  // Missing conditions
  // Missing actions
};

/**
 * Multiple pricing rules for testing
 */
export const mockPricingRules = [
  basePricingRule,
  weightBasedRule,
  distanceBasedRule,
  specialItemsRule,
  seasonalRule,
  stairsHandicapRule,
  crewSizeRule,
];

/**
 * Test rule data
 */
export const testRuleData = {
  rule: basePricingRule,
  testData: {
    service: 'local',
    totalWeight: 3000,
    totalVolume: 500,
    distance: 15,
    crewSize: 2,
    isWeekend: true,
    isHoliday: false,
    seasonalPeriod: 'standard',
    specialItems: { piano: false, antiques: false },
  },
};

/**
 * Rule filter examples
 */
export const ruleFilters = {
  byCategory: {
    category: 'timing',
  },
  byActive: {
    isActive: true,
  },
  byService: {
    service: 'local',
  },
  bySearch: {
    search: 'weekend',
  },
};

/**
 * Rule history entry
 */
export const mockRuleHistory = {
  id: 'history_123',
  ruleId: 'rule_weekend_surcharge',
  action: 'updated' as const,
  changes: {
    amount: { old: 10, new: 15 },
    description: { old: 'Weekend fee', new: 'Weekend surcharge' },
  },
  userId: 'user_123',
  userName: 'Admin User',
  timestamp: new Date('2025-06-01'),
  reason: 'Updated to reflect new pricing strategy',
};

/**
 * Rule backup
 */
export const mockRuleBackup = {
  id: 'backup_1622505600000',
  timestamp: new Date('2025-06-01'),
  userId: 'system',
  userName: 'System Backup',
  rulesCount: 7,
  description: 'Automatic backup created before rule changes',
  rules: mockPricingRules,
};
