import { faker } from '@faker-js/faker';

/**
 * Seed customers with various statuses and types
 */
export async function seedCustomers(
  CustomerModel: any,
  users: any[],
  partners: any[]
): Promise<any[]> {
  const customers: any[] = [];
  const salesReps = users.filter((u) => u.department === 'Sales');
  const customerCount = faker.number.int({ min: 25, max: 35 });
  const types = ['residential', 'commercial'];
  const sources = ['website', 'referral', 'advertising', 'social_media', 'partner', 'other'];
  const contactMethods = ['email', 'phone', 'text'];

  for (let i = 0; i < customerCount; i++) {
    const type = faker.helpers.arrayElement(types);
    const status = faker.helpers.weightedArrayElement([
      { value: 'lead', weight: 3 },
      { value: 'prospect', weight: 3 },
      { value: 'active', weight: 5 },
      { value: 'inactive', weight: 1 },
    ]);
    const source = faker.helpers.arrayElement(sources);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    // Check if customer with this email already exists
    const existing = await CustomerModel.findOne({ email });
    if (existing) {
      customers.push(existing);
      continue;
    }

    // Assign sales rep
    const assignedSalesRep = salesReps.length > 0
      ? faker.helpers.arrayElement(salesReps)._id.toString()
      : users[0]._id.toString();

    // Generate referral info for partner sources
    let referredBy = undefined;
    if (source === 'partner' && partners.length > 0) {
      const partner = faker.helpers.arrayElement(partners);
      referredBy = {
        partnerId: partner._id.toString(),
        partnerName: partner.companyName,
        source: 'partner',
      };
    } else if (source === 'referral' && faker.datatype.boolean()) {
      // Sometimes a customer referral
      const existingCustomer = faker.helpers.arrayElement(
        customers.length > 0 ? customers : [{ _id: 'existing-customer' }]
      );
      referredBy = {
        customerId: existingCustomer._id.toString(),
        source: 'customer_referral',
      };
    }

    const customer = await CustomerModel.create({
      firstName,
      lastName,
      email,
      phone: faker.phone.number(),
      alternatePhone: faker.datatype.boolean() ? faker.phone.number() : undefined,
      type,
      status,
      source,
      companyName: type === 'commercial' ? faker.company.name() : undefined,
      businessLicense: type === 'commercial' ? faker.string.alphanumeric(10).toUpperCase() : undefined,
      preferredContactMethod: faker.helpers.arrayElement(contactMethods),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode('#####'),
        country: 'USA',
      },
      communicationPreferences: {
        allowMarketing: faker.datatype.boolean(),
        allowSms: faker.datatype.boolean(),
        allowEmail: faker.datatype.boolean(),
      },
      referredBy,
      assignedSalesRep,
      leadScore: faker.number.int({ min: 0, max: 100 }),
      tags: faker.helpers.arrayElements(
        ['high-value', 'vip', 'repeat-customer', 'corporate', 'seasonal', 'price-sensitive'],
        { min: 0, max: 3 }
      ),
      notes: faker.datatype.boolean()
        ? faker.lorem.paragraph()
        : undefined,
      estimates: [],
      jobs: [],
      lastContactDate: status !== 'lead'
        ? faker.date.recent({ days: 30 })
        : undefined,
      createdBy: assignedSalesRep,
      preferredMoveDate: faker.datatype.boolean()
        ? faker.date.future({ years: 0.5 })
        : undefined,
      estimatedBudget: faker.datatype.boolean()
        ? faker.number.int({ min: 500, max: 5000 })
        : undefined,
      emergencyContact: faker.datatype.boolean()
        ? {
            name: faker.person.fullName(),
            phone: faker.phone.number(),
            relationship: faker.helpers.arrayElement(['spouse', 'parent', 'sibling', 'friend']),
          }
        : undefined,
    });

    customers.push(customer);
  }

  return customers;
}
