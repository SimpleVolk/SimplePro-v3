import { Types } from 'mongoose';
import {
  MaterialCategory,
  HandicapCategory,
  TariffStatus,
  PricingMethodType,
} from '../interfaces/tariff-settings.interface';

/**
 * Generate consistent ObjectId from timestamp
 * Used for seed data to ensure reproducible IDs
 */
function generateId(index: number): string {
  return new Types.ObjectId(Math.floor(Date.now() / 1000) + index).toString();
}

/**
 * Default Tariff Settings Data
 * Based on production screenshots and industry standards
 *
 * Data sources:
 * - hourlyrate1.png, hourlyrate2.png, hourlyrate3.png
 * - Settings-Tariffs-TariffLibrary-PackingRates-1.png
 * - autopricingengine1.png, Settings-Tariffs-TariffLibrary-AutoPricingEngine.png
 * - Settings-Tariffs-TariffLibrary-Materials.png
 * - movingsize1.png, movingsize2.png
 * - Settings-Tariffs-Handicaps.png
 * - pricingmethoddefaults1.png, pricingmethoddefaults2.png, pricingmethoddefaults3.png
 */
export const defaultTariffData = {
  // ============================
  // Metadata
  // ============================
  name: 'Default Tariff Settings',
  description:
    'Production-ready tariff configuration with industry-standard rates',
  isActive: true,
  status: TariffStatus.ACTIVE,
  version: '1.0.0',
  effectiveFrom: new Date('2025-01-01'),
  // effectiveTo is optional - omitted means no end date
  createdBy: 'system',
  lastModifiedBy: 'system',
  isArchived: false,
  notes:
    'Initial seed data based on industry best practices and production requirements',
  tags: ['default', 'production', 'v1'],

  // ============================
  // Hourly Rates Configuration
  // ============================
  hourlyRates: {
    enabled: true,
    minimumHours: {
      weekday: 2,
      weekend: 3,
      holiday: 3,
    },
    rates: [
      // Standard Hourly Rates (from hourlyrate1.png)
      {
        crewSize: 1,
        baseRate: 89,
        weekendRate: 89,
        holidayRate: 89,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 2,
        baseRate: 100,
        weekendRate: 100,
        holidayRate: 100,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 3,
        baseRate: 220,
        weekendRate: 200,
        holidayRate: 220,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 4,
        baseRate: 300,
        weekendRate: 280,
        holidayRate: 300,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 5,
        baseRate: 360,
        weekendRate: 340,
        holidayRate: 360,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 6,
        baseRate: 420,
        weekendRate: 400,
        holidayRate: 420,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 7,
        baseRate: 480,
        weekendRate: 460,
        holidayRate: 480,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 8,
        baseRate: 540,
        weekendRate: 520,
        holidayRate: 540,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 9,
        baseRate: 600,
        weekendRate: 580,
        holidayRate: 600,
        overtimeMultiplier: 1.5,
      },
      {
        crewSize: 10,
        baseRate: 660,
        weekendRate: 640,
        holidayRate: 660,
        overtimeMultiplier: 1.5,
      },
    ],
    // Crew Ability from autopricingengine1.png (Volume capacity in cubic feet)
    crewAbility: [
      { crewSize: 1, maxCubicFeet: 50, maxWeightLbs: 350 },
      { crewSize: 2, maxCubicFeet: 100, maxWeightLbs: 700 },
      { crewSize: 3, maxCubicFeet: 150, maxWeightLbs: 1050 },
      { crewSize: 4, maxCubicFeet: 200, maxWeightLbs: 1400 },
      { crewSize: 5, maxCubicFeet: 250, maxWeightLbs: 1750 },
      { crewSize: 6, maxCubicFeet: 300, maxWeightLbs: 2100 },
      { crewSize: 7, maxCubicFeet: 350, maxWeightLbs: 2450 },
      { crewSize: 8, maxCubicFeet: 400, maxWeightLbs: 2800 },
      { crewSize: 9, maxCubicFeet: 450, maxWeightLbs: 3150 },
      { crewSize: 10, maxCubicFeet: 500, maxWeightLbs: 3500 },
    ],
  },

  // ============================
  // Packing Rates Configuration
  // ============================
  packingRates: {
    enabled: true,
    rates: [
      // From Settings-Tariffs-TariffLibrary-PackingRates-1.png
      {
        itemType: '1 Crew',
        description: 'Single packer hourly rate',
        rate: 80,
        unit: 'hour',
        category: 'hourly',
      },
      {
        itemType: '2 Crew',
        description: 'Two packers hourly rate',
        rate: 150,
        unit: 'hour',
        category: 'hourly',
      },
      {
        itemType: '3 Crew',
        description: 'Three packers hourly rate',
        rate: 240,
        unit: 'hour',
        category: 'hourly',
      },
      {
        itemType: '4 Crew',
        description: 'Four packers hourly rate',
        rate: 330,
        unit: 'hour',
        category: 'hourly',
      },
      {
        itemType: 'Per Additional Crew',
        description: 'Additional packer rate',
        rate: 50,
        unit: 'hour',
        category: 'additional',
      },
    ],
  },

  // ============================
  // Auto Pricing Configuration
  // ============================
  autoPricing: {
    enabled: true,
    maxHoursPerJob: 10, // From autopricingengine1.png
    useCrewAbilityLimits: true,
    applyWeekendSurcharge: true,
    weekendSurchargePercent: 10,
    applyHolidaySurcharge: true,
    holidaySurchargePercent: 15,
  },

  // ============================
  // Materials Configuration
  // ============================
  materials: [
    // From Settings-Tariffs-TariffLibrary-Materials.png
    {
      id: generateId(1),
      name: 'Small Box',
      description: '1.5 Cuft',
      category: MaterialCategory.BOX,
      unitPrice: 0,
      unit: 'box',
      isActive: true,
      inStock: true,
      sku: '503',
      notes: 'Container item with 1.5 cubic feet capacity',
    },
    {
      id: generateId(2),
      name: 'Medium Box',
      description: '3.0 Cuft',
      category: MaterialCategory.BOX,
      unitPrice: 0,
      unit: 'box',
      isActive: true,
      inStock: true,
      sku: '505',
      notes: 'Container item with 3.0 cubic feet capacity',
    },
    {
      id: generateId(3),
      name: 'Large Box',
      description: '4.5 Cuft',
      category: MaterialCategory.BOX,
      unitPrice: 0,
      unit: 'box',
      isActive: true,
      inStock: true,
      sku: '507',
      notes: 'Container item with 4.5 cubic feet capacity',
    },
    {
      id: generateId(4),
      name: 'Dish Box',
      description: '18" x 18" x 28"',
      category: MaterialCategory.SPECIALTY,
      unitPrice: 0,
      unit: 'box',
      isActive: true,
      inStock: true,
      sku: '501',
      notes:
        'Specialty container for dishes with 45 min pack time, 20 min unpack time',
    },
    {
      id: generateId(5),
      name: 'TV Box',
      description: 'Television protection box',
      category: MaterialCategory.SPECIALTY,
      unitPrice: 0,
      unit: 'box',
      isActive: true,
      inStock: true,
      sku: '509',
      notes: 'Container item with 5 min pack/unpack time',
    },
    {
      id: generateId(6),
      name: 'Wardrobe Box',
      description: '20" x 20" x 34"',
      category: MaterialCategory.SPECIALTY,
      unitPrice: 0,
      unit: 'box',
      isActive: true,
      inStock: true,
      sku: '513',
      notes: 'Container item with 7 min pack time, 3 min unpack time',
    },
    {
      id: generateId(7),
      name: 'Mattress Bag (King)',
      description: 'King size mattress protection',
      category: MaterialCategory.PROTECTION,
      unitPrice: 0,
      unit: 'bag',
      isActive: true,
      inStock: true,
      sku: '511',
      notes: 'Protection item with 10 min pack time, 3 min unpack time',
    },
    {
      id: generateId(8),
      name: 'Mattress Bag (Queen)',
      description: 'Queen size mattress protection',
      category: MaterialCategory.PROTECTION,
      unitPrice: 0,
      unit: 'bag',
      isActive: true,
      inStock: true,
      sku: '512',
      notes: 'Protection item with 10 min pack time, 3 min unpack time',
    },
    {
      id: generateId(9),
      name: 'Mattress Bag (Full)',
      description: 'Full size mattress protection',
      category: MaterialCategory.PROTECTION,
      unitPrice: 0,
      unit: 'bag',
      isActive: true,
      inStock: true,
      sku: '515',
      notes: 'Protection item with 10 min pack time, 3 min unpack time',
    },
    {
      id: generateId(10),
      name: 'Packing Paper (100)',
      description: '100 Sheets',
      category: MaterialCategory.PACKING,
      unitPrice: 0,
      unit: 'pack',
      isActive: true,
      inStock: true,
      notes: 'Non-container packing material',
    },
    {
      id: generateId(11),
      name: 'Packing Paper (200)',
      description: '200 Sheets',
      category: MaterialCategory.PACKING,
      unitPrice: 0,
      unit: 'pack',
      isActive: true,
      inStock: true,
      notes: 'Non-container packing material',
    },
    {
      id: generateId(12),
      name: 'Furniture Pad',
      description: '68" x 85"',
      category: MaterialCategory.PROTECTION,
      unitPrice: 0,
      unit: 'pad',
      isActive: true,
      inStock: true,
      notes: 'Non-container protection item',
    },
    {
      id: generateId(13),
      name: 'Medium Plastic Wrap',
      description: 'Standard plastic wrap roll',
      category: MaterialCategory.PACKING,
      unitPrice: 0,
      unit: 'roll',
      isActive: true,
      inStock: true,
      notes: 'Non-container packing material',
    },
    {
      id: generateId(14),
      name: 'Lollipop Plastic Wrap',
      description: 'Handle-style plastic wrap',
      category: MaterialCategory.PACKING,
      unitPrice: 0,
      unit: 'roll',
      isActive: true,
      inStock: true,
      notes: 'Non-container packing material',
    },
  ],

  // ============================
  // Move Sizes Configuration
  // ============================
  moveSizes: [
    // From movingsize1.png and movingsize2.png
    {
      id: generateId(101),
      name: 'Room or Less',
      description: 'Under 400 SqFt',
      minCubicFeet: 0,
      maxCubicFeet: 75,
      minWeightLbs: 0,
      maxWeightLbs: 525,
      recommendedCrewSize: 1,
      estimatedHours: 2,
      isActive: true,
    },
    {
      id: generateId(102),
      name: 'Studio Apartment',
      description: '400-800 SqFt',
      minCubicFeet: 76,
      maxCubicFeet: 432,
      minWeightLbs: 526,
      maxWeightLbs: 3024,
      recommendedCrewSize: 2,
      estimatedHours: 3,
      isActive: true,
    },
    {
      id: generateId(103),
      name: '1 Bedroom Apartment',
      description: '800-1400 SqFt',
      minCubicFeet: 433,
      maxCubicFeet: 864,
      minWeightLbs: 3025,
      maxWeightLbs: 6048,
      recommendedCrewSize: 2,
      estimatedHours: 4,
      isActive: true,
    },
    {
      id: generateId(104),
      name: '2 Bedroom Apartment',
      description: '1400-1800 SqFt',
      minCubicFeet: 865,
      maxCubicFeet: 1296,
      minWeightLbs: 6049,
      maxWeightLbs: 9072,
      recommendedCrewSize: 3,
      estimatedHours: 5,
      isActive: true,
    },
    {
      id: generateId(105),
      name: '3 Bedroom Apartment',
      description: '1800-2200 SqFt',
      minCubicFeet: 1297,
      maxCubicFeet: 1728,
      minWeightLbs: 9073,
      maxWeightLbs: 12096,
      recommendedCrewSize: 3,
      estimatedHours: 6,
      isActive: true,
    },
    {
      id: generateId(106),
      name: '1 Bedroom House',
      description: '800-1400 SqFt',
      minCubicFeet: 865,
      maxCubicFeet: 1536,
      minWeightLbs: 6049,
      maxWeightLbs: 10752,
      recommendedCrewSize: 2,
      estimatedHours: 5,
      isActive: true,
    },
    {
      id: generateId(107),
      name: '2 Bedroom House',
      description: '1400-1800 SqFt',
      minCubicFeet: 1297,
      maxCubicFeet: 1920,
      minWeightLbs: 9073,
      maxWeightLbs: 13440,
      recommendedCrewSize: 3,
      estimatedHours: 6,
      isActive: true,
    },
    {
      id: generateId(108),
      name: '3 Bedroom House',
      description: '1800-2200 SqFt',
      minCubicFeet: 1729,
      maxCubicFeet: 2304,
      minWeightLbs: 12097,
      maxWeightLbs: 16128,
      recommendedCrewSize: 3,
      estimatedHours: 7,
      isActive: true,
    },
    {
      id: generateId(109),
      name: '2 Bedroom House (Large)',
      description: '1800-2200 SqFt',
      minCubicFeet: 1921,
      maxCubicFeet: 2520,
      minWeightLbs: 13441,
      maxWeightLbs: 17640,
      recommendedCrewSize: 3,
      estimatedHours: 7,
      isActive: true,
    },
    {
      id: generateId(110),
      name: '3 Bedroom House (Large)',
      description: '2200-2600 SqFt',
      minCubicFeet: 2305,
      maxCubicFeet: 2688,
      minWeightLbs: 16129,
      maxWeightLbs: 18816,
      recommendedCrewSize: 4,
      estimatedHours: 8,
      isActive: true,
    },
    {
      id: generateId(111),
      name: '4 Bedroom House',
      description: '2600-3000 SqFt',
      minCubicFeet: 2521,
      maxCubicFeet: 3072,
      minWeightLbs: 17641,
      maxWeightLbs: 21504,
      recommendedCrewSize: 4,
      estimatedHours: 9,
      isActive: true,
    },
    {
      id: generateId(112),
      name: '4 Bedroom House (Large)',
      description: '3000-3400 SqFt',
      minCubicFeet: 3073,
      maxCubicFeet: 3456,
      minWeightLbs: 21505,
      maxWeightLbs: 24192,
      recommendedCrewSize: 4,
      estimatedHours: 10,
      isActive: true,
    },
    {
      id: generateId(113),
      name: '5 Bedroom House',
      description: '3400-3800 SqFt',
      minCubicFeet: 3457,
      maxCubicFeet: 3840,
      minWeightLbs: 24193,
      maxWeightLbs: 26880,
      recommendedCrewSize: 5,
      estimatedHours: 11,
      isActive: true,
    },
    {
      id: generateId(114),
      name: '5 Bedroom House (Large)',
      description: '3800-4200 SqFt',
      minCubicFeet: 3841,
      maxCubicFeet: 4200,
      minWeightLbs: 26881,
      maxWeightLbs: 29400,
      recommendedCrewSize: 5,
      estimatedHours: 12,
      isActive: true,
    },
    {
      id: generateId(115),
      name: '6 Bedroom House',
      description: '4200+ SqFt',
      minCubicFeet: 4201,
      maxCubicFeet: 4584,
      minWeightLbs: 29401,
      maxWeightLbs: 32088,
      recommendedCrewSize: 6,
      estimatedHours: 13,
      isActive: true,
    },
    {
      id: generateId(116),
      name: '14 ft Storage Unit',
      description: 'Standard 14 foot storage unit',
      minCubicFeet: 700,
      maxCubicFeet: 800,
      minWeightLbs: 4900,
      maxWeightLbs: 5600,
      recommendedCrewSize: 2,
      estimatedHours: 4,
      isActive: true,
    },
    {
      id: generateId(117),
      name: '16 x 16 Storage Unit',
      description: '16x16 storage unit',
      minCubicFeet: 850,
      maxCubicFeet: 940,
      minWeightLbs: 5950,
      maxWeightLbs: 6580,
      recommendedCrewSize: 2,
      estimatedHours: 4,
      isActive: true,
    },
    {
      id: generateId(118),
      name: '16 x 20 Storage Unit',
      description: '16x20 storage unit',
      minCubicFeet: 941,
      maxCubicFeet: 1000,
      minWeightLbs: 6581,
      maxWeightLbs: 7000,
      recommendedCrewSize: 2,
      estimatedHours: 5,
      isActive: true,
    },
    {
      id: generateId(119),
      name: '20 x 20 Storage Unit',
      description: '20x20 storage unit',
      minCubicFeet: 1150,
      maxCubicFeet: 1300,
      minWeightLbs: 8050,
      maxWeightLbs: 9100,
      recommendedCrewSize: 3,
      estimatedHours: 5,
      isActive: true,
    },
    {
      id: generateId(120),
      name: '20 x 25 Storage Unit',
      description: '20x25 storage unit',
      minCubicFeet: 1450,
      maxCubicFeet: 1600,
      minWeightLbs: 10150,
      maxWeightLbs: 11200,
      recommendedCrewSize: 3,
      estimatedHours: 6,
      isActive: true,
    },
    {
      id: generateId(121),
      name: '20 x 30 Storage Unit',
      description: '20x30 storage unit',
      minCubicFeet: 1750,
      maxCubicFeet: 1920,
      minWeightLbs: 12250,
      maxWeightLbs: 13440,
      recommendedCrewSize: 3,
      estimatedHours: 7,
      isActive: true,
    },
  ],

  // ============================
  // Room Sizes Configuration
  // ============================
  roomSizes: [
    // From movingsize2.png
    {
      id: generateId(201),
      name: 'Additional Room',
      description: 'Generic additional room',
      cubicFeet: 153,
      weightLbs: 750,
      commonItems: ['furniture', 'boxes', 'miscellaneous'],
      isActive: true,
    },
    {
      id: generateId(202),
      name: 'Bedroom',
      description: 'Standard bedroom',
      cubicFeet: 153,
      weightLbs: 750,
      commonItems: ['bed', 'dresser', 'nightstand', 'wardrobe', 'boxes'],
      isActive: true,
    },
    {
      id: generateId(203),
      name: 'Dining Room',
      description: 'Standard dining room',
      cubicFeet: 153,
      weightLbs: 750,
      commonItems: ['dining table', 'chairs', 'hutch', 'sideboard'],
      isActive: true,
    },
    {
      id: generateId(204),
      name: 'Kitchen',
      description: 'Standard kitchen',
      cubicFeet: 153,
      weightLbs: 750,
      commonItems: ['appliances', 'cookware', 'dishes', 'pantry items'],
      isActive: true,
    },
    {
      id: generateId(205),
      name: 'Living Room',
      description: 'Standard living room',
      cubicFeet: 153,
      weightLbs: 750,
      commonItems: [
        'sofa',
        'coffee table',
        'tv',
        'entertainment center',
        'end tables',
      ],
      isActive: true,
    },
    {
      id: generateId(206),
      name: 'Office',
      description: 'Home office',
      cubicFeet: 75,
      weightLbs: 525,
      commonItems: ['desk', 'chair', 'filing cabinet', 'bookshelf', 'computer'],
      isActive: true,
    },
    {
      id: generateId(207),
      name: 'Patio',
      description: 'Outdoor patio area',
      cubicFeet: 153,
      weightLbs: 750,
      commonItems: ['patio furniture', 'grill', 'outdoor accessories'],
      isActive: true,
    },
  ],

  // ============================
  // Handicaps Configuration
  // ============================
  handicaps: [
    // From Settings-Tariffs-Handicaps.png
    {
      id: generateId(301),
      name: 'Per Flight',
      description: 'Stairs handicap per flight',
      category: HandicapCategory.STAIRS,
      type: 'percentage' as const,
      value: 9,
      unit: 'flight',
      isActive: true,
      appliesTo: ['both' as const],
      notes: 'Default handicap for stairs - 9% per flight',
    },
    {
      id: generateId(302),
      name: 'Standard Elevator',
      description: 'Elevator handicap',
      category: HandicapCategory.ELEVATOR,
      type: 'percentage' as const,
      value: 18,
      unit: 'building',
      isActive: true,
      appliesTo: ['both' as const],
      notes: 'Default handicap for elevator access - 18% flat rate',
    },
    {
      id: generateId(303),
      name: 'Per 100 Feet',
      description: 'Long carry handicap per 100 feet',
      category: HandicapCategory.ACCESS,
      type: 'percentage' as const,
      value: 9,
      unit: '100 feet',
      isActive: true,
      appliesTo: ['both' as const],
      notes: 'Default handicap for long carry - 9% per 100 feet',
    },
  ],

  // ============================
  // Distance Rates Configuration
  // ============================
  distanceRates: [
    // From Settings-Tariffs-TariffLibrary-DistanceRates.png
    // Weight-based tiers - industry standard long distance rates
    {
      id: generateId(401),
      name: 'Local Distance (0-50 miles)',
      description: 'Short distance moves within metro area',
      minMiles: 0,
      maxMiles: 50,
      ratePerMile: 0,
      minimumCharge: 0,
      isActive: true,
    },
    {
      id: generateId(402),
      name: 'Regional Distance (51-200 miles)',
      description: 'Regional moves',
      minMiles: 51,
      maxMiles: 200,
      ratePerMile: 2.5,
      minimumCharge: 250,
      isActive: true,
    },
    {
      id: generateId(403),
      name: 'Long Distance (201-500 miles)',
      description: 'Interstate moves',
      minMiles: 201,
      maxMiles: 500,
      ratePerMile: 2.0,
      minimumCharge: 500,
      isActive: true,
    },
    {
      id: generateId(404),
      name: 'Cross Country (501+ miles)',
      description: 'Long haul interstate moves',
      minMiles: 501,
      maxMiles: 10000,
      ratePerMile: 1.75,
      minimumCharge: 1000,
      isActive: true,
    },
  ],

  // ============================
  // Pricing Method Defaults
  // ============================
  pricingMethods: [
    // From pricingmethoddefaults1.png, pricingmethoddefaults2.png, pricingmethoddefaults3.png
    {
      method: PricingMethodType.HOURLY,
      enabled: true,
      isDefault: true,
      configuration: {
        name: 'Local Labor',
        conditions: [
          { field: 'opportunityType', operator: 'equals', value: 'Local' },
          { field: 'serviceType', operator: 'equals', value: 'Moving' },
        ],
        priority: 10,
        description: 'Standard hourly pricing for local moving services',
      },
    },
    {
      method: PricingMethodType.HOURLY,
      enabled: true,
      isDefault: false,
      configuration: {
        name: 'Local Packing',
        conditions: [
          { field: 'opportunityType', operator: 'equals', value: 'Local' },
          { field: 'serviceType', operator: 'equals', value: 'Packing' },
        ],
        priority: 20,
        description: 'Hourly packing rates for local services',
      },
    },
    {
      method: PricingMethodType.HOURLY,
      enabled: true,
      isDefault: false,
      configuration: {
        name: 'Local Labor Only',
        conditions: [
          { field: 'opportunityType', operator: 'equals', value: 'Local' },
          { field: 'serviceType', operator: 'equals', value: 'Labor Only' },
        ],
        priority: 30,
        description: 'Labor-only hourly rates',
      },
    },
    {
      method: PricingMethodType.DISTANCE_BASED,
      enabled: false,
      isDefault: false,
      configuration: {
        name: 'Sample Long Distance Transportation',
        conditions: [
          { field: 'opportunityType', operator: 'equals', value: 'Interstate' },
        ],
        priority: 40,
        description: 'Distance-based pricing for long distance moves',
      },
    },
    {
      method: PricingMethodType.WEIGHT_BASED,
      enabled: false,
      isDefault: false,
      configuration: {
        name: 'Sample Long Distance Packing',
        conditions: [
          { field: 'opportunityType', operator: 'equals', value: 'Interstate' },
          { field: 'serviceType', operator: 'equals', value: 'Packing' },
        ],
        priority: 50,
        description: 'Weight-based packing charges for long distance',
      },
    },
  ],

  // ============================
  // Audit Log
  // ============================
  auditLog: [
    {
      timestamp: new Date(),
      userId: 'system',
      action: 'INITIAL_SEED',
      changes: {
        operation: 'create',
        description: 'Initial default tariff settings created from seed data',
      },
    },
  ],
};
