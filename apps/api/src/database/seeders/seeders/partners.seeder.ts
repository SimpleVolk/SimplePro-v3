import { faker } from '@faker-js/faker';

/**
 * Seed referral partners
 */
export async function seedPartners(
  PartnerModel: any,
  users: any[],
): Promise<any[]> {
  const partners: any[] = [];
  const partnerCount = faker.number.int({ min: 8, max: 12 });

  const partnerTypes = [
    'real_estate_agent',
    'property_manager',
    'relocation_company',
    'storage_facility',
    'corporate_client',
    'referral_network',
    'other',
  ];

  for (let i = 0; i < partnerCount; i++) {
    const companyName = faker.company.name();
    const email = faker.internet.email({
      provider: companyName.toLowerCase().replace(/\s+/g, '') + '.com',
    });

    // Check if partner already exists
    const existing = await PartnerModel.findOne({ email });
    if (existing) {
      partners.push(existing);
      continue;
    }

    const status = faker.helpers.weightedArrayElement([
      { value: 'active', weight: 7 },
      { value: 'pending', weight: 2 },
      { value: 'inactive', weight: 1 },
      { value: 'suspended', weight: 0.5 },
    ]);

    const partnerType = faker.helpers.arrayElement(partnerTypes);

    // Generate commission structure
    const commissionType = faker.helpers.arrayElement([
      'percentage',
      'flat_rate',
      'tiered',
    ]);
    const commissionStructure: any = {
      type: commissionType,
      paymentTerms: faker.helpers.arrayElement(['net30', 'net60', 'net15']),
    };

    if (commissionType === 'percentage') {
      commissionStructure.rate = faker.number.float({
        min: 5,
        max: 15,
        fractionDigits: 2,
      });
    } else if (commissionType === 'flat_rate') {
      commissionStructure.flatAmount = faker.number.int({ min: 50, max: 200 });
    } else if (commissionType === 'tiered') {
      commissionStructure.tiers = [
        { minValue: 0, maxValue: 1000, rate: 5 },
        { minValue: 1000, maxValue: 3000, rate: 7.5 },
        { minValue: 3000, maxValue: 999999, rate: 10 },
      ];
    }

    // Generate statistics for active partners
    const isActive = status === 'active';
    const totalLeadsReferred = isActive
      ? faker.number.int({ min: 10, max: 100 })
      : 0;
    const totalLeadsConverted = isActive
      ? faker.number.int({ min: 0, max: Math.floor(totalLeadsReferred * 0.7) })
      : 0;
    const conversionRate =
      totalLeadsReferred > 0
        ? (totalLeadsConverted / totalLeadsReferred) * 100
        : 0;

    const partner = await PartnerModel.create({
      companyName,
      contactName: faker.person.fullName(),
      email,
      phone: faker.phone.number(),
      partnerType,
      status,
      commissionStructure,
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode('#####'),
        country: 'USA',
      },
      website: faker.datatype.boolean() ? faker.internet.url() : undefined,
      portalAccess: {
        enabled: isActive && faker.datatype.boolean(),
        username: isActive ? email : undefined,
        hashedPassword: undefined, // Would be set when partner sets password
        lastLogin: undefined,
      },
      statistics: {
        totalLeadsReferred,
        totalLeadsConverted,
        totalRevenue:
          totalLeadsConverted * faker.number.int({ min: 800, max: 3000 }),
        totalCommissionsPaid:
          totalLeadsConverted * faker.number.int({ min: 50, max: 200 }),
        conversionRate,
      },
      settings: {
        autoNotifyOnLeadUpdate: true,
        preferredContactMethod: faker.helpers.arrayElement([
          'email',
          'phone',
          'portal',
        ]),
        customFields: {},
      },
      contractStartDate: isActive ? faker.date.past({ years: 2 }) : undefined,
      contractEndDate: isActive ? faker.date.future({ years: 1 }) : undefined,
      notes: faker.datatype.boolean() ? faker.lorem.paragraph() : undefined,
      tags: faker.helpers.arrayElements(
        ['high-volume', 'premium', 'reliable', 'seasonal', 'new'],
        { min: 0, max: 3 },
      ),
      createdBy: users[0]._id.toString(),
    });

    partners.push(partner);
  }

  return partners;
}
