import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

/**
 * Seed users with different roles
 */
export async function seedUsers(UserModel: any): Promise<any[]> {
  const users: any[] = [];
  const SALT_ROUNDS = 12;

  // Define test users with specific roles
  const testUsers = [
    {
      username: 'sarah.sales',
      email: 'sarah.sales@simplepro.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: {
        name: 'admin',
        level: 2,
        description: 'Administrator with full system access',
      },
      department: 'Sales',
      phoneNumber: faker.phone.number(),
      permissions: [
        { resource: 'users', actions: ['read', 'create', 'update'] },
        {
          resource: 'customers',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { resource: 'jobs', actions: ['read', 'create', 'update', 'delete'] },
        {
          resource: 'estimates',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { resource: 'reports', actions: ['read'] },
      ],
    },
    {
      username: 'david.dispatch',
      email: 'david.dispatch@simplepro.com',
      firstName: 'David',
      lastName: 'Martinez',
      role: {
        name: 'dispatcher',
        level: 3,
        description: 'Dispatcher - manages crew scheduling and job assignments',
      },
      department: 'Operations',
      phoneNumber: faker.phone.number(),
      permissions: [
        { resource: 'jobs', actions: ['read', 'create', 'update'] },
        { resource: 'crews', actions: ['read', 'update'] },
        {
          resource: 'schedules',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { resource: 'customers', actions: ['read'] },
      ],
    },
    {
      username: 'mike.crew',
      email: 'mike.crew@simplepro.com',
      firstName: 'Mike',
      lastName: 'Thompson',
      role: {
        name: 'crew',
        level: 4,
        description: 'Crew Member - field operations',
      },
      department: 'Operations',
      crewId: faker.string.uuid(),
      phoneNumber: faker.phone.number(),
      permissions: [
        { resource: 'jobs', actions: ['read', 'update'] },
        { resource: 'schedules', actions: ['read'] },
      ],
    },
    {
      username: 'emily.sales',
      email: 'emily.sales@simplepro.com',
      firstName: 'Emily',
      lastName: 'Chen',
      role: {
        name: 'admin',
        level: 2,
        description: 'Administrator with full system access',
      },
      department: 'Sales',
      phoneNumber: faker.phone.number(),
      permissions: [
        { resource: 'users', actions: ['read', 'create', 'update'] },
        {
          resource: 'customers',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { resource: 'jobs', actions: ['read', 'create', 'update', 'delete'] },
        {
          resource: 'estimates',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { resource: 'reports', actions: ['read'] },
      ],
    },
    {
      username: 'james.crew',
      email: 'james.crew@simplepro.com',
      firstName: 'James',
      lastName: 'Wilson',
      role: {
        name: 'crew',
        level: 4,
        description: 'Crew Member - field operations',
      },
      department: 'Operations',
      crewId: faker.string.uuid(),
      phoneNumber: faker.phone.number(),
      permissions: [
        { resource: 'jobs', actions: ['read', 'update'] },
        { resource: 'schedules', actions: ['read'] },
      ],
    },
    {
      username: 'lisa.admin',
      email: 'lisa.admin@simplepro.com',
      firstName: 'Lisa',
      lastName: 'Anderson',
      role: {
        name: 'super_admin',
        level: 1,
        description: 'Super Administrator - complete system control',
      },
      department: 'Management',
      phoneNumber: faker.phone.number(),
      permissions: [
        { resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
        {
          resource: 'customers',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { resource: 'jobs', actions: ['read', 'create', 'update', 'delete'] },
        {
          resource: 'estimates',
          actions: ['read', 'create', 'update', 'delete'],
        },
        {
          resource: 'reports',
          actions: ['read', 'create', 'update', 'delete'],
        },
        {
          resource: 'settings',
          actions: ['read', 'create', 'update', 'delete'],
        },
      ],
    },
  ];

  // Hash password for all test users
  const passwordHash = await bcrypt.hash('Test123!', SALT_ROUNDS);

  // Get admin user to use as creator
  const adminUser = await UserModel.findOne({ username: 'admin' });
  const createdBy = adminUser ? adminUser._id.toString() : 'system';

  // Create test users
  for (const userData of testUsers) {
    // Check if user already exists
    const existing = await UserModel.findOne({ username: userData.username });
    if (existing) {
      users.push(existing);
      continue;
    }

    const user = await UserModel.create({
      ...userData,
      passwordHash,
      isActive: true,
      mustChangePassword: false,
      createdBy,
      lastModifiedBy: createdBy,
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        timezone: 'America/New_York',
      },
      fcmTokens: [],
    });

    users.push(user);
  }

  // Add 3-4 more crew members with random names
  const crewCount = faker.number.int({ min: 3, max: 4 });
  for (let i = 0; i < crewCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username =
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.substring(0, 20);

    // Check if already exists
    const existing = await UserModel.findOne({ username });
    if (existing) {
      users.push(existing);
      continue;
    }

    const user = await UserModel.create({
      username,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: {
        name: 'crew',
        level: 4,
        description: 'Crew Member - field operations',
      },
      department: 'Operations',
      crewId: faker.string.uuid(),
      phoneNumber: faker.phone.number(),
      isActive: true,
      mustChangePassword: false,
      createdBy,
      lastModifiedBy: createdBy,
      permissions: [
        { resource: 'jobs', actions: ['read', 'update'] },
        { resource: 'schedules', actions: ['read'] },
      ],
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        timezone: 'America/New_York',
      },
      fcmTokens: [],
    });

    users.push(user);
  }

  return users;
}
