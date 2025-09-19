import { EstimateInput } from '../schemas/rules.schema';

export const sampleInputs = {
  // Basic local move - studio apartment
  studioLocal: {
    customerId: 'customer-001',
    moveDate: new Date('2024-10-15'),
    service: 'local',
    pickup: {
      address: '123 Main St, Apartment 2A, Springfield, IL 62701',
      floorLevel: 2,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 25,
      accessDifficulty: 'moderate',
      stairsCount: 1,
      narrowHallways: false
    },
    delivery: {
      address: '456 Oak Ave, Springfield, IL 62702',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 15,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    distance: 12,
    estimatedDuration: 4,
    rooms: [
      {
        id: 'room-1',
        type: 'studio',
        description: 'Studio apartment with kitchen area',
        items: [],
        packingRequired: true,
        totalWeight: 2500,
        totalVolume: 400
      }
    ],
    totalWeight: 2500,
    totalVolume: 400,
    specialItems: {
      piano: false,
      antiques: false,
      artwork: false,
      fragileItems: 3,
      valuableItems: 2
    },
    additionalServices: {
      packing: false,
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false
    },
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
    crewSize: 2,
    specialtyCrewRequired: false
  } as EstimateInput,

  // Large local move with piano and stairs
  largeLargePiano: {
    customerId: 'customer-002',
    moveDate: new Date('2024-07-20'), // Peak season
    service: 'local',
    pickup: {
      address: '789 Elm Street, Springfield, IL 62703',
      floorLevel: 3,
      elevatorAccess: false,
      longCarry: true,
      parkingDistance: 85,
      accessDifficulty: 'difficult',
      stairsCount: 3,
      narrowHallways: true
    },
    delivery: {
      address: '321 Pine Road, Springfield, IL 62704',
      floorLevel: 2,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 30,
      accessDifficulty: 'moderate',
      stairsCount: 2,
      narrowHallways: false
    },
    distance: 8,
    estimatedDuration: 8,
    rooms: [
      {
        id: 'room-1',
        type: 'living_room',
        description: 'Living room with piano',
        items: [],
        packingRequired: false,
        totalWeight: 3500,
        totalVolume: 650
      },
      {
        id: 'room-2',
        type: 'bedroom',
        description: 'Master bedroom',
        items: [],
        packingRequired: true,
        totalWeight: 2800,
        totalVolume: 450
      }
    ],
    totalWeight: 6300,
    totalVolume: 1100,
    specialItems: {
      piano: true,
      antiques: true,
      artwork: false,
      fragileItems: 8,
      valuableItems: 5
    },
    additionalServices: {
      packing: true,
      unpacking: false,
      assembly: true,
      storage: false,
      cleaning: false
    },
    isWeekend: true,
    isHoliday: false,
    seasonalPeriod: 'peak',
    crewSize: 4,
    specialtyCrewRequired: true
  } as EstimateInput,

  // Long distance move - heavy shipment
  longDistanceHeavy: {
    customerId: 'customer-003',
    moveDate: new Date('2024-11-10'), // Off peak
    service: 'long_distance',
    pickup: {
      address: '555 Maple Drive, Springfield, IL 62701',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    delivery: {
      address: '777 Cedar Lane, Denver, CO 80202',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 35,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    distance: 920,
    estimatedDuration: 12,
    rooms: [
      {
        id: 'room-1',
        type: 'garage',
        description: 'Garage with heavy equipment',
        items: [],
        packingRequired: false,
        totalWeight: 4500,
        totalVolume: 800
      },
      {
        id: 'room-2',
        type: 'living_room',
        description: 'Main living areas',
        items: [],
        packingRequired: true,
        totalWeight: 4200,
        totalVolume: 750
      },
      {
        id: 'room-3',
        type: 'bedroom',
        description: 'All bedrooms',
        items: [],
        packingRequired: true,
        totalWeight: 3800,
        totalVolume: 650
      }
    ],
    totalWeight: 12500,
    totalVolume: 2200,
    specialItems: {
      piano: false,
      antiques: false,
      artwork: false,
      fragileItems: 2,
      valuableItems: 3
    },
    additionalServices: {
      packing: true,
      unpacking: true,
      assembly: true,
      storage: true,
      cleaning: false
    },
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
    crewSize: 3,
    specialtyCrewRequired: false
  } as EstimateInput,

  // Weekend local move with multiple challenges
  weekendChallenge: {
    customerId: 'customer-004',
    moveDate: new Date('2024-09-14'), // Weekend
    service: 'local',
    pickup: {
      address: '999 Hill Street, Springfield, IL 62705',
      floorLevel: 4,
      elevatorAccess: false,
      longCarry: true,
      parkingDistance: 120,
      accessDifficulty: 'extreme',
      stairsCount: 4,
      narrowHallways: true,
      specialRequirements: ['Narrow stairwell', 'No parking permit area']
    },
    delivery: {
      address: '111 Valley Road, Springfield, IL 62706',
      floorLevel: 3,
      elevatorAccess: true,
      longCarry: false,
      parkingDistance: 10,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    distance: 15,
    estimatedDuration: 6,
    rooms: [
      {
        id: 'room-1',
        type: 'living_room',
        description: 'Living room with antiques',
        items: [],
        packingRequired: true,
        totalWeight: 2200,
        totalVolume: 450
      }
    ],
    totalWeight: 4800,
    totalVolume: 850,
    specialItems: {
      piano: false,
      antiques: true,
      artwork: true,
      fragileItems: 12,
      valuableItems: 8
    },
    additionalServices: {
      packing: true,
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false
    },
    isWeekend: true,
    isHoliday: false,
    seasonalPeriod: 'standard',
    crewSize: 3,
    specialtyCrewRequired: false
  } as EstimateInput,

  // Minimum charge scenario
  minimalLocal: {
    customerId: 'customer-005',
    moveDate: new Date('2024-12-05'),
    service: 'local',
    pickup: {
      address: '222 Short St, Springfield, IL 62701',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 10,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    delivery: {
      address: '333 Near Ave, Springfield, IL 62701',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 15,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    distance: 2,
    estimatedDuration: 1.5, // Less than minimum
    rooms: [
      {
        id: 'room-1',
        type: 'office',
        description: 'Small office items only',
        items: [],
        packingRequired: false,
        totalWeight: 800,
        totalVolume: 150
      }
    ],
    totalWeight: 800,
    totalVolume: 150,
    specialItems: {
      piano: false,
      antiques: false,
      artwork: false,
      fragileItems: 0,
      valuableItems: 0
    },
    additionalServices: {
      packing: false,
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false
    },
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
    crewSize: 2,
    specialtyCrewRequired: false
  } as EstimateInput,

  // Packing only service
  packingOnly: {
    customerId: 'customer-006',
    moveDate: new Date('2024-10-25'),
    service: 'packing_only',
    pickup: {
      address: '444 Pack Street, Springfield, IL 62702',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    delivery: {
      address: '444 Pack Street, Springfield, IL 62702', // Same location
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    distance: 0,
    estimatedDuration: 6,
    rooms: [
      {
        id: 'room-1',
        type: 'kitchen',
        description: 'Kitchen items requiring careful packing',
        items: [],
        packingRequired: true,
        totalWeight: 1200,
        totalVolume: 300
      },
      {
        id: 'room-2',
        type: 'living_room',
        description: 'Fragile items and artwork',
        items: [],
        packingRequired: true,
        totalWeight: 800,
        totalVolume: 200
      }
    ],
    totalWeight: 2000,
    totalVolume: 500,
    specialItems: {
      piano: false,
      antiques: false,
      artwork: true,
      fragileItems: 15,
      valuableItems: 5
    },
    additionalServices: {
      packing: true,
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false
    },
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
    crewSize: 2,
    specialtyCrewRequired: false
  } as EstimateInput
};