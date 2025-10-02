import { faker } from '@faker-js/faker';

/**
 * Seed jobs across all statuses
 */
export async function seedJobs(
  JobModel: any,
  customers: any[],
  users: any[],
  opportunities: any[]
): Promise<any[]> {
  const jobs: any[] = [];
  const jobCount = faker.number.int({ min: 35, max: 50 });

  const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'];
  const types = ['local', 'long_distance', 'storage', 'packing_only'];
  const priorities = ['low', 'normal', 'high', 'urgent'];

  // Get crew members and dispatchers
  const crewMembers = users.filter((u) => u.role.name === 'crew');
  const dispatchers = users.filter((u) => u.role.name === 'dispatcher');
  const creator = dispatchers.length > 0 ? dispatchers[0] : users[0];

  for (let i = 0; i < jobCount; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const status = faker.helpers.weightedArrayElement([
      { value: 'scheduled', weight: 3 },
      { value: 'in_progress', weight: 2 },
      { value: 'completed', weight: 6 },
      { value: 'cancelled', weight: 1 },
      { value: 'on_hold', weight: 0.5 },
    ]);

    const type = faker.helpers.arrayElement(types);
    const priority = faker.helpers.weightedArrayElement([
      { value: 'low', weight: 1 },
      { value: 'normal', weight: 6 },
      { value: 'high', weight: 2 },
      { value: 'urgent', weight: 1 },
    ]);

    // Generate job number
    const jobNumber = `JOB-${new Date().getFullYear()}-${String(i + 1000).padStart(4, '0')}`;

    // Check if job already exists
    const existing = await JobModel.findOne({ jobNumber });
    if (existing) {
      jobs.push(existing);
      continue;
    }

    // Generate dates based on status
    let scheduledDate: Date;
    let actualStartTime: Date | undefined;
    let actualEndTime: Date | undefined;

    if (status === 'completed') {
      scheduledDate = faker.date.recent({ days: 90 });
      actualStartTime = new Date(scheduledDate);
      actualStartTime.setHours(8, 0, 0);
      actualEndTime = new Date(actualStartTime);
      actualEndTime.setHours(actualEndTime.getHours() + faker.number.int({ min: 4, max: 10 }));
    } else if (status === 'in_progress') {
      scheduledDate = faker.date.recent({ days: 3 });
      actualStartTime = new Date(scheduledDate);
      actualStartTime.setHours(8, 0, 0);
    } else if (status === 'cancelled') {
      scheduledDate = faker.date.recent({ days: 60 });
    } else {
      // scheduled or on_hold
      scheduledDate = faker.date.future({ years: 0.3 });
    }

    // Generate addresses
    const pickupAddress = {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode('#####'),
      country: 'USA',
      accessNotes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      contactPerson: faker.person.fullName(),
      contactPhone: faker.phone.number(),
    };

    const deliveryAddress = {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode('#####'),
      country: 'USA',
      accessNotes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      contactPerson: faker.person.fullName(),
      contactPhone: faker.phone.number(),
    };

    // Assign crew (2-5 crew members)
    const assignedCrewCount = faker.number.int({ min: 2, max: Math.min(5, crewMembers.length) });
    const assignedCrew = faker.helpers.arrayElements(crewMembers, assignedCrewCount).map((crew) => ({
      crewMemberId: crew._id.toString(),
      role: faker.helpers.arrayElement(['driver', 'mover', 'packer', 'lead']),
      assignedAt: new Date(),
      confirmedAt: status !== 'scheduled' ? new Date() : undefined,
    }));

    const leadCrew = assignedCrew.length > 0 ? assignedCrew[0].crewMemberId : undefined;

    // Generate inventory
    const inventoryCount = faker.number.int({ min: 5, max: 20 });
    const inventory: any[] = [];
    for (let inv = 0; inv < inventoryCount; inv++) {
      inventory.push({
        name: faker.helpers.arrayElement(['Sofa', 'Bed', 'Dresser', 'Table', 'Chair', 'Box']),
        quantity: faker.number.int({ min: 1, max: 5 }),
        volume: faker.number.float({ min: 1, max: 50, fractionDigits: 2 }),
        weight: faker.number.float({ min: 10, max: 200, fractionDigits: 2 }),
        fragile: faker.datatype.boolean(),
        requiresDisassembly: faker.datatype.boolean(),
      });
    }

    // Generate services
    const services = [
      {
        name: 'Moving',
        description: 'Standard moving service',
        price: faker.number.int({ min: 400, max: 2000 }),
        included: true,
      },
    ];

    if (faker.datatype.boolean()) {
      services.push({
        name: 'Packing',
        description: 'Professional packing service',
        price: faker.number.int({ min: 200, max: 800 }),
        included: false,
      });
    }

    // Generate equipment requirements
    const equipment = faker.helpers.arrayElements(
      [
        { name: 'Dolly', quantity: 2, status: 'assigned' },
        { name: 'Moving Blankets', quantity: 20, status: 'assigned' },
        { name: 'Straps', quantity: 4, status: 'assigned' },
        { name: 'Tools', quantity: 1, status: 'assigned' },
      ],
      { min: 2, max: 4 }
    );

    // Calculate pricing
    const estimatedCost = faker.number.int({ min: 600, max: 4500 });
    const actualCost = status === 'completed'
      ? faker.number.int({ min: estimatedCost - 200, max: estimatedCost + 300 })
      : undefined;

    const laborCost = Math.round(estimatedCost * 0.6);
    const materialsCost = Math.round(estimatedCost * 0.2);
    const transportationCost = Math.round(estimatedCost * 0.2);

    // Additional charges for some jobs
    const additionalCharges: any[] = [];
    if (faker.datatype.boolean(0.3)) {
      additionalCharges.push({
        description: faker.helpers.arrayElement(['Extra stairs', 'Long carry', 'Heavy items']),
        amount: faker.number.int({ min: 50, max: 200 }),
        approvedBy: creator._id.toString(),
        approvedAt: new Date(),
      });
    }

    // Milestones for completed jobs
    const milestones: any[] = [];
    if (status === 'completed' || status === 'in_progress') {
      milestones.push(
        {
          name: 'Job Started',
          description: 'Crew arrived and began loading',
          completedAt: actualStartTime,
          completedBy: leadCrew,
        },
        {
          name: 'Items Loaded',
          description: 'All items loaded onto truck',
          completedAt: actualStartTime ? new Date(actualStartTime.getTime() + 2 * 60 * 60 * 1000) : undefined,
          completedBy: leadCrew,
        }
      );

      if (status === 'completed') {
        milestones.push(
          {
            name: 'Items Unloaded',
            description: 'All items unloaded at destination',
            completedAt: actualEndTime ? new Date(actualEndTime.getTime() - 1 * 60 * 60 * 1000) : undefined,
            completedBy: leadCrew,
          },
          {
            name: 'Job Completed',
            description: 'Customer signed off on delivery',
            completedAt: actualEndTime,
            completedBy: leadCrew,
          }
        );
      }
    }

    // Find related opportunity
    const relatedOpp = opportunities.find(
      (opp) => opp.customerId === customer._id.toString() && opp.status === 'won'
    );

    const job = await JobModel.create({
      jobNumber,
      title: `${type.replace('_', ' ').toUpperCase()} - ${customer.firstName} ${customer.lastName}`,
      description: faker.datatype.boolean() ? faker.lorem.paragraph() : undefined,
      type,
      status,
      priority,
      customerId: customer._id.toString(),
      estimateId: relatedOpp?._id.toString(),
      scheduledDate,
      scheduledStartTime: '08:00',
      scheduledEndTime: '17:00',
      estimatedDuration: faker.number.int({ min: 4, max: 12 }),
      actualStartTime,
      actualEndTime,
      pickupAddress,
      deliveryAddress,
      assignedCrew,
      leadCrew,
      crewNotes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      inventory,
      services,
      specialInstructions: faker.datatype.boolean() ? faker.lorem.paragraph() : undefined,
      equipment,
      estimatedCost,
      actualCost,
      laborCost,
      materialsCost,
      transportationCost,
      additionalCharges,
      milestones,
      photos: [],
      documents: [],
      customerNotifications: [],
      internalNotes: faker.datatype.boolean()
        ? [
            {
              note: faker.lorem.paragraph(),
              createdBy: creator._id.toString(),
              createdAt: new Date(),
            },
          ]
        : [],
      createdBy: creator._id.toString(),
      lastModifiedBy: creator._id.toString(),
    });

    jobs.push(job);
  }

  return jobs;
}
