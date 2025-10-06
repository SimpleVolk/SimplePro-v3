import { faker } from '@faker-js/faker';

/**
 * Seed opportunities (estimates/quotes)
 */
export async function seedOpportunities(
  OpportunityModel: any,
  customers: any[],
  users: any[],
): Promise<any[]> {
  const opportunities: any[] = [];
  const opportunityCount = faker.number.int({ min: 40, max: 60 });

  const services = ['local', 'long_distance', 'storage', 'packing_only'];
  const moveSizes = ['studio', '1br', '2br', '3br', '4br', '5br', 'custom'];
  const buildingTypes = [
    'apartment',
    'house',
    'condo',
    'office',
    'warehouse',
    'storage',
  ];
  const accessDifficulties = [
    'easy',
    'moderate',
    'difficult',
    'very_difficult',
  ];
  const flexibilities = ['exact', 'week', 'month'];
  const leadSources = [
    'website',
    'phone',
    'referral',
    'partner',
    'walkin',
    'other',
  ];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  for (let i = 0; i < opportunityCount; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const service = faker.helpers.arrayElement(services);
    const moveSize = faker.helpers.arrayElement(moveSizes);
    const status = faker.helpers.weightedArrayElement([
      { value: 'open', weight: 2 },
      { value: 'contacted', weight: 2 },
      { value: 'quoted', weight: 3 },
      { value: 'negotiating', weight: 2 },
      { value: 'won', weight: 4 },
      { value: 'lost', weight: 2 },
      { value: 'cancelled', weight: 1 },
    ]);

    // Generate move date based on status
    let moveDate: Date;
    if (status === 'won' || status === 'lost' || status === 'cancelled') {
      // Past dates for closed opportunities
      moveDate = faker.date.recent({ days: 90 });
    } else {
      // Future dates for open opportunities
      moveDate = faker.date.future({ years: 0.5 });
    }

    // Generate pickup location details
    const pickupFloorLevel = faker.number.int({ min: 1, max: 10 });
    const pickupHasElevator =
      pickupFloorLevel > 3 ? faker.datatype.boolean() : false;

    const pickup = {
      address: faker.location.streetAddress(true),
      buildingType: faker.helpers.arrayElement(buildingTypes),
      floorLevel: pickupFloorLevel,
      elevatorAccess: pickupHasElevator,
      stairsCount: pickupHasElevator ? 0 : Math.floor(pickupFloorLevel * 1.5),
      longCarry: faker.datatype.boolean(),
      parkingDistance: faker.number.int({ min: 10, max: 200 }),
      accessDifficulty: faker.helpers.arrayElement(accessDifficulties),
      narrowHallways: faker.datatype.boolean(),
      specialNotes: faker.datatype.boolean() ? faker.lorem.sentence() : '',
    };

    // Generate delivery location details
    const deliveryFloorLevel = faker.number.int({ min: 1, max: 10 });
    const deliveryHasElevator =
      deliveryFloorLevel > 3 ? faker.datatype.boolean() : false;

    const delivery = {
      address: faker.location.streetAddress(true),
      buildingType: faker.helpers.arrayElement(buildingTypes),
      floorLevel: deliveryFloorLevel,
      elevatorAccess: deliveryHasElevator,
      stairsCount: deliveryHasElevator
        ? 0
        : Math.floor(deliveryFloorLevel * 1.5),
      longCarry: faker.datatype.boolean(),
      parkingDistance: faker.number.int({ min: 10, max: 200 }),
      accessDifficulty: faker.helpers.arrayElement(accessDifficulties),
      narrowHallways: faker.datatype.boolean(),
      specialNotes: faker.datatype.boolean() ? faker.lorem.sentence() : '',
    };

    // Generate inventory rooms
    const roomCount = faker.number.int({ min: 1, max: 8 });
    const rooms: any[] = [];
    let totalWeight = 0;
    let totalVolume = 0;

    for (let r = 0; r < roomCount; r++) {
      const roomWeight = faker.number.int({ min: 200, max: 1500 });
      const roomVolume = faker.number.int({ min: 50, max: 300 });
      totalWeight += roomWeight;
      totalVolume += roomVolume;

      rooms.push({
        id: faker.string.uuid(),
        type: faker.helpers.arrayElement([
          'living_room',
          'bedroom',
          'kitchen',
          'office',
          'storage',
        ]),
        description: faker.lorem.sentence(),
        items: [], // Simplified for seed data
        packingRequired: faker.datatype.boolean(),
        totalWeight: roomWeight,
        totalVolume: roomVolume,
      });
    }

    // Special items
    const specialItems = {
      piano: faker.datatype.boolean(0.2),
      poolTable: faker.datatype.boolean(0.1),
      safe: faker.datatype.boolean(0.15),
      antiques: faker.datatype.boolean(0.3),
      artwork: faker.datatype.boolean(0.25),
      fragileItems: faker.number.int({ min: 0, max: 10 }),
      valuableItems: faker.number.int({ min: 0, max: 5 }),
    };

    // Additional services
    const additionalServices = {
      packing: faker.helpers.arrayElement(['none', 'partial', 'full']),
      unpacking: faker.datatype.boolean(),
      assembly: faker.datatype.boolean(),
      storage: faker.datatype.boolean(),
      storageDuration: faker.datatype.boolean()
        ? faker.number.int({ min: 1, max: 12 })
        : undefined,
      cleaning: faker.datatype.boolean(),
    };

    // Calculate distance and duration
    const distance =
      service === 'long_distance'
        ? faker.number.int({ min: 200, max: 2000 })
        : faker.number.int({ min: 5, max: 50 });
    const estimatedDuration = faker.number.int({ min: 4, max: 12 });
    const crewSize = faker.number.int({ min: 2, max: 6 });

    // Calculate estimated price based on various factors
    const basePrice = service === 'long_distance' ? 2000 : 800;
    const weightFactor = (totalWeight / 1000) * 100;
    const distanceFactor = distance * (service === 'long_distance' ? 2 : 0.5);
    const crewFactor = crewSize * 150;
    const estimatedPrice = Math.round(
      basePrice + weightFactor + distanceFactor + crewFactor,
    );

    const salesRep = users.find((u) => u.department === 'Sales') || users[0];

    const opportunity = await OpportunityModel.create({
      customerId: customer._id.toString(),
      customerType: 'existing',
      service,
      moveDate,
      moveSize,
      flexibility: faker.helpers.arrayElement(flexibilities),
      pickup,
      delivery,
      rooms,
      totalWeight,
      totalVolume,
      specialItems,
      additionalServices,
      leadSource: faker.helpers.arrayElement(leadSources),
      assignedSalesRep: salesRep._id.toString(),
      priority: faker.helpers.arrayElement(priorities),
      internalNotes: faker.datatype.boolean() ? faker.lorem.paragraph() : '',
      followUpDate:
        status === 'open' || status === 'contacted'
          ? faker.date.soon({ days: 7 })
          : undefined,
      distance,
      estimatedDuration,
      crewSize,
      isWeekend: moveDate.getDay() === 0 || moveDate.getDay() === 6,
      isHoliday: faker.datatype.boolean(0.05),
      seasonalPeriod: faker.helpers.arrayElement([
        'peak',
        'standard',
        'off_peak',
      ]),
      estimatedPrice:
        status === 'quoted' || status === 'negotiating' || status === 'won'
          ? estimatedPrice
          : undefined,
      status,
      createdBy: salesRep._id.toString(),
      updatedBy: salesRep._id.toString(),
    });

    opportunities.push(opportunity);
  }

  return opportunities;
}
