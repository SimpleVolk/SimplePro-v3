/**
 * Estimates Test Fixtures
 *
 * Provides realistic test data for estimates service testing.
 */

import { CreateEstimateDto } from '../../src/estimates/dto/create-estimate.dto';

/**
 * Base estimate DTO for local move
 */
export const baseEstimateDto: CreateEstimateDto = {
  serviceType: 'local',
  moveDate: '2025-06-15',
  locations: {
    pickup: {
      address: '123 Main St, Apt 2B, City, State 12345',
      stairs: 10,
      longCarry: 50,
      parkingDistance: 25,
      difficultAccess: 1,
      narrowHallways: false,
    },
    delivery: {
      address: '456 Oak Ave, Unit 5C, City, State 54321',
      stairs: 20,
      longCarry: 75,
      parkingDistance: 50,
      difficultAccess: 2,
      narrowHallways: true,
    },
  },
  inventory: {
    weight: 3000,
    volume: 500,
    crewSize: 2,
    specialItems: {
      piano: 0,
      antiques: 0,
      artwork: 0,
      fragileItems: 0,
    },
  },
  services: {
    packing: false,
    assembly: false,
    storage: false,
  },
};

/**
 * Large move with special items
 */
export const largeEstimateDto: CreateEstimateDto = {
  ...baseEstimateDto,
  moveDate: '2025-07-20',
  inventory: {
    weight: 8000,
    volume: 1200,
    crewSize: 4,
    specialItems: {
      piano: 1,
      antiques: 3,
      artwork: 2,
      fragileItems: 10,
    },
  },
  services: {
    packing: true,
    assembly: true,
    storage: false,
  },
};

/**
 * Weekend move estimate
 */
export const weekendEstimateDto: CreateEstimateDto = {
  ...baseEstimateDto,
  moveDate: '2025-06-21', // Saturday
  inventory: {
    weight: 4000,
    volume: 600,
    crewSize: 3,
    specialItems: {
      piano: 1,
      antiques: 0,
      artwork: 0,
      fragileItems: 5,
    },
  },
};

/**
 * Peak season move estimate
 */
export const peakSeasonEstimateDto: CreateEstimateDto = {
  ...baseEstimateDto,
  moveDate: '2025-08-15', // Peak season (summer)
  inventory: {
    weight: 5000,
    volume: 800,
    crewSize: 3,
    specialItems: {
      piano: 0,
      antiques: 1,
      artwork: 1,
      fragileItems: 3,
    },
  },
  services: {
    packing: true,
    assembly: false,
    storage: true,
  },
};

/**
 * Off-season move estimate
 */
export const offSeasonEstimateDto: CreateEstimateDto = {
  ...baseEstimateDto,
  moveDate: '2025-01-15', // Winter (off-season)
  inventory: {
    weight: 2500,
    volume: 400,
    crewSize: 2,
    specialItems: {
      piano: 0,
      antiques: 0,
      artwork: 0,
      fragileItems: 0,
    },
  },
};

/**
 * Minimum viable estimate
 */
export const minimalEstimateDto: CreateEstimateDto = {
  serviceType: 'local',
  moveDate: '2025-06-15',
  locations: {
    pickup: {
      address: '123 Main St',
      stairs: 0,
      longCarry: 0,
      parkingDistance: 0,
      difficultAccess: 1,
      narrowHallways: false,
    },
    delivery: {
      address: '456 Oak Ave',
      stairs: 0,
      longCarry: 0,
      parkingDistance: 0,
      difficultAccess: 1,
      narrowHallways: false,
    },
  },
  inventory: {
    weight: 1000,
    volume: 200,
    crewSize: 2,
    specialItems: {
      piano: 0,
      antiques: 0,
      artwork: 0,
      fragileItems: 0,
    },
  },
  services: {
    packing: false,
    assembly: false,
    storage: false,
  },
};

/**
 * Difficult access estimate
 */
export const difficultAccessEstimateDto: CreateEstimateDto = {
  ...baseEstimateDto,
  locations: {
    pickup: {
      address: '123 Main St',
      stairs: 40, // 4 floors
      longCarry: 150,
      parkingDistance: 100,
      difficultAccess: 3, // Difficult
      narrowHallways: true,
    },
    delivery: {
      address: '456 Oak Ave',
      stairs: 50, // 5 floors
      longCarry: 200,
      parkingDistance: 150,
      difficultAccess: 4, // Extreme
      narrowHallways: true,
    },
  },
  inventory: {
    weight: 3500,
    volume: 550,
    crewSize: 3,
    specialItems: {
      piano: 1,
      antiques: 2,
      artwork: 1,
      fragileItems: 5,
    },
  },
};

/**
 * Invalid estimate (missing required fields)
 */
export const invalidEstimateDto: any = {
  serviceType: 'local',
  // Missing moveDate
  locations: {
    pickup: {
      address: '123 Main St',
    },
    // Missing delivery
  },
  inventory: {
    // Missing weight and volume
    crewSize: 2,
  },
};

/**
 * Mock estimate result from pricing engine
 */
export const mockEstimateResult = {
  totalPrice: 850.5,
  basePrice: 600,
  adjustments: [
    {
      description: 'Stairs surcharge',
      amount: 100,
      percentage: null,
    },
    {
      description: 'Long carry surcharge',
      amount: 75,
      percentage: null,
    },
    {
      description: 'Weekend surcharge',
      amount: 75.5,
      percentage: 12.5,
    },
  ],
  calculations: {
    appliedRules: [
      {
        ruleId: 'rule_stairs',
        ruleName: 'Stairs Surcharge',
        priceImpact: 100,
      },
      {
        ruleId: 'rule_long_carry',
        ruleName: 'Long Carry Surcharge',
        priceImpact: 75,
      },
    ],
    basePriceCalculation: {
      laborCost: 400,
      travelCost: 100,
      materialsCost: 100,
    },
  },
  breakdown: {
    labor: 400,
    travel: 100,
    materials: 100,
    surcharges: 250.5,
  },
  metadata: {
    calculatedAt: new Date().toISOString(),
    calculatedBy: 'api-user',
    verificationHash: 'abc123def456',
  },
};
