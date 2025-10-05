import { Model } from 'mongoose';
import { User } from '../../src/auth/schemas/user.schema';
import { Customer } from '../../src/customers/schemas/customer.schema';
import { Job } from '../../src/jobs/schemas/job.schema';
import * as bcrypt from 'bcrypt';

export interface TestDataSet {
  users: {
    admin: any;
    dispatcher: any;
    crewLead: any;
    crewMember1: any;
    crewMember2: any;
  };
  customers: any[];
  jobs: any[];
  opportunities: any[];
  partners: any[];
}

export class TestDataSeeder {
  constructor(
    private readonly userModel: Model<User>,
    private readonly customerModel?: Model<Customer>,
    private readonly jobModel?: Model<Job>,
  ) {}

  async seedAll(): Promise<TestDataSet> {
    const users = await this.seedUsers();
    const customers = await this.seedCustomers();
    const partners = await this.seedPartners();
    const opportunities = await this.seedOpportunities(customers);
    const jobs = await this.seedJobs(customers, users);

    return {
      users,
      customers,
      jobs,
      opportunities,
      partners,
    };
  }

  async seedUsers() {
    const hashedPassword = await bcrypt.hash('Test123!', 12);

    const admin = await this.userModel.create({
      userId: 'test-admin-001',
      username: 'testadmin',
      email: 'testadmin@simplepro.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      permissions: ['*'],
    });

    const dispatcher = await this.userModel.create({
      userId: 'test-dispatcher-001',
      username: 'testdispatcher',
      email: 'testdispatcher@simplepro.com',
      password: hashedPassword,
      role: 'dispatcher',
      firstName: 'Sarah',
      lastName: 'Dispatcher',
      isActive: true,
      permissions: [
        'customers.read',
        'customers.write',
        'jobs.read',
        'jobs.write',
        'jobs.assign',
        'estimates.read',
        'estimates.create',
        'calendar.read',
        'calendar.write',
      ],
    });

    const crewLead = await this.userModel.create({
      userId: 'test-crew-lead-001',
      username: 'testcrewlead',
      email: 'testcrewlead@simplepro.com',
      password: hashedPassword,
      role: 'crew',
      firstName: 'John',
      lastName: 'Smith',
      isActive: true,
      position: 'crew_lead',
      skills: {
        canDrive: true,
        hasCommercialLicense: true,
        hasMovingExperience: true,
        yearsExperience: 8,
        specializations: ['piano', 'antiques', 'heavy_equipment'],
      },
      performanceMetrics: {
        rating: 4.9,
        jobsCompleted: 250,
        averageJobDuration: 5.2,
        customerSatisfactionScore: 4.8,
        onTimeRate: 0.96,
      },
      availability: {
        maxHoursPerWeek: 50,
        preferredShifts: ['morning', 'afternoon'],
      },
      location: {
        lat: 37.7749,
        lng: -122.4194,
        address: 'San Francisco, CA',
      },
    });

    const crewMember1 = await this.userModel.create({
      userId: 'test-crew-member-001',
      username: 'testcrew1',
      email: 'testcrew1@simplepro.com',
      password: hashedPassword,
      role: 'crew',
      firstName: 'Mike',
      lastName: 'Johnson',
      isActive: true,
      position: 'mover',
      skills: {
        canDrive: true,
        hasCommercialLicense: true,
        hasMovingExperience: true,
        yearsExperience: 5,
        specializations: ['packing', 'assembly'],
      },
      performanceMetrics: {
        rating: 4.7,
        jobsCompleted: 180,
        averageJobDuration: 5.5,
        customerSatisfactionScore: 4.6,
        onTimeRate: 0.94,
      },
      availability: {
        maxHoursPerWeek: 45,
        preferredShifts: ['morning', 'afternoon', 'evening'],
      },
      location: {
        lat: 37.7849,
        lng: -122.4094,
        address: 'San Francisco, CA',
      },
    });

    const crewMember2 = await this.userModel.create({
      userId: 'test-crew-member-002',
      username: 'testcrew2',
      email: 'testcrew2@simplepro.com',
      password: hashedPassword,
      role: 'crew',
      firstName: 'David',
      lastName: 'Williams',
      isActive: true,
      position: 'mover',
      skills: {
        canDrive: false,
        hasCommercialLicense: false,
        hasMovingExperience: true,
        yearsExperience: 3,
        specializations: ['packing'],
      },
      performanceMetrics: {
        rating: 4.5,
        jobsCompleted: 120,
        averageJobDuration: 6.0,
        customerSatisfactionScore: 4.4,
        onTimeRate: 0.92,
      },
      availability: {
        maxHoursPerWeek: 40,
        preferredShifts: ['afternoon', 'evening'],
      },
      location: {
        lat: 37.7649,
        lng: -122.4294,
        address: 'San Francisco, CA',
      },
    });

    return {
      admin,
      dispatcher,
      crewLead,
      crewMember1,
      crewMember2,
    };
  }

  async seedCustomers() {
    if (!this.customerModel) return [];

    const customers = await this.customerModel.create([
      {
        customerId: 'test-customer-001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '555-0123',
        type: 'residential',
        status: 'active',
        leadSource: 'website',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA',
        },
        preferences: {
          preferredContactMethod: 'email',
          preferredMovingDays: ['weekday'],
        },
      },
      {
        customerId: 'test-customer-002',
        firstName: 'Robert',
        lastName: 'Smith',
        email: 'robert.smith@example.com',
        phone: '555-0456',
        type: 'residential',
        status: 'prospect',
        leadSource: 'referral',
        address: {
          street: '456 Oak Ave',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94110',
          country: 'USA',
        },
      },
      {
        customerId: 'test-customer-003',
        companyName: 'Tech Startup Inc',
        firstName: 'Emily',
        lastName: 'Johnson',
        email: 'emily@techstartup.com',
        phone: '555-0789',
        type: 'commercial',
        status: 'active',
        leadSource: 'google_ads',
        address: {
          street: '789 Market St, Suite 500',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94103',
          country: 'USA',
        },
      },
      {
        customerId: 'test-customer-004',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@example.com',
        phone: '555-0321',
        type: 'residential',
        status: 'lead',
        leadSource: 'facebook',
        address: {
          street: '321 Pine St',
          city: 'Oakland',
          state: 'CA',
          zipCode: '94607',
          country: 'USA',
        },
      },
      {
        customerId: 'test-customer-005',
        firstName: 'Sarah',
        lastName: 'Davis',
        email: 'sarah.davis@example.com',
        phone: '555-0654',
        type: 'residential',
        status: 'inactive',
        leadSource: 'website',
        address: {
          street: '654 Elm St',
          city: 'Berkeley',
          state: 'CA',
          zipCode: '94704',
          country: 'USA',
        },
      },
    ]);

    return customers;
  }

  async seedJobs(customers: any[], users: any) {
    if (!this.jobModel) return [];

    const jobs = await this.jobModel.create([
      {
        jobId: 'test-job-001',
        customerId: customers[0]?.customerId || 'test-customer-001',
        serviceType: 'local',
        status: 'scheduled',
        priority: 'high',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        pickupAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
        },
        deliveryAddress: {
          street: '456 Oak Ave',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94110',
        },
        estimatedCost: 2500,
        estimatedCrewSize: 3,
        requiresCDL: true,
        assignedCrew: [
          {
            crewMemberId: users.crewLead.userId,
            role: 'crew_lead',
            assignedAt: new Date(),
          },
          {
            crewMemberId: users.crewMember1.userId,
            role: 'mover',
            assignedAt: new Date(),
          },
        ],
      },
      {
        jobId: 'test-job-002',
        customerId: customers[1]?.customerId || 'test-customer-002',
        serviceType: 'local',
        status: 'in_progress',
        priority: 'medium',
        scheduledDate: new Date(),
        pickupAddress: {
          street: '789 Market St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94103',
        },
        deliveryAddress: {
          street: '321 Pine St',
          city: 'Oakland',
          state: 'CA',
          zipCode: '94607',
        },
        estimatedCost: 1800,
        estimatedCrewSize: 2,
        requiresCDL: false,
        assignedCrew: [
          {
            crewMemberId: users.crewMember1.userId,
            role: 'crew_lead',
            assignedAt: new Date(),
          },
          {
            crewMemberId: users.crewMember2.userId,
            role: 'mover',
            assignedAt: new Date(),
          },
        ],
      },
      {
        jobId: 'test-job-003',
        customerId: customers[0]?.customerId || 'test-customer-001',
        serviceType: 'long_distance',
        status: 'completed',
        priority: 'low',
        scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        completedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        pickupAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
        },
        deliveryAddress: {
          street: '999 Broadway',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90012',
        },
        estimatedCost: 8500,
        actualCost: 8750,
        estimatedCrewSize: 4,
        requiresCDL: true,
        assignedCrew: [
          {
            crewMemberId: users.crewLead.userId,
            role: 'crew_lead',
            assignedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    ]);

    return jobs;
  }

  async seedOpportunities() {
    // Opportunities seeding would go here
    // For now, return empty array as opportunity schema may not exist yet
    return [];
  }

  async seedPartners() {
    // Partners seeding would go here
    return [];
  }

  async cleanup() {
    await this.userModel.deleteMany({ userId: /^test-/ });
    if (this.customerModel) {
      await this.customerModel.deleteMany({ customerId: /^test-/ });
    }
    if (this.jobModel) {
      await this.jobModel.deleteMany({ jobId: /^test-/ });
    }
  }
}
