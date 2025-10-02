import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer as CustomerSchema } from './schemas/customer.schema';
import {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilters
} from './interfaces/customer.interface';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockCustomerModel: any;

  const mockCustomer: Customer = {
    id: 'customer123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    alternatePhone: '(555) 987-6543',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA'
    },
    type: 'residential',
    status: 'lead',
    source: 'website',
    preferredContactMethod: 'email',
    communicationPreferences: {
      allowMarketing: true,
      allowSms: true,
      allowEmail: true
    },
    notes: 'Interested in moving services',
    leadScore: 75,
    tags: ['hot-lead', 'long-distance'],
    assignedSalesRep: 'sales123',
    referredBy: {
      partnerName: 'Moving Partners LLC',
      source: 'partner'
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    createdBy: 'user123',
    lastContactDate: new Date('2024-01-20T14:30:00Z'),
    estimates: ['estimate123'],
    jobs: ['job123']
  };

  const mockCommercialCustomer: Customer = {
    id: 'commercial123',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    phone: '(555) 111-2222',
    address: {
      street: '456 Business Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601'
    },
    type: 'commercial',
    status: 'active',
    source: 'referral',
    companyName: 'Smith Enterprises',
    businessLicense: 'BL123456',
    preferredContactMethod: 'phone',
    communicationPreferences: {
      allowMarketing: false,
      allowSms: false,
      allowEmail: true
    },
    leadScore: 90,
    createdAt: new Date('2024-01-10T09:00:00Z'),
    updatedAt: new Date('2024-01-10T09:00:00Z'),
    createdBy: 'user123',
    estimates: [],
    jobs: []
  };

  // Create chainable query mock
  const createMockQuery = (returnValue: any = []) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue)
  });

  // Create mock Customer model
  const createMockCustomerModel = () => {
    const savedCustomers = new Map<string, any>();
    let idCounter = 0;

    const mockConstructor: any = jest.fn().mockImplementation((data) => {
      const id = `customer_${++idCounter}`;
      const customerDoc = {
        ...data,
        _id: id,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({ ...data, id }),
        save: jest.fn().mockImplementation(async function() {
          savedCustomers.set(id, this);
          return this;
        })
      };
      savedCustomers.set(id, customerDoc);
      return customerDoc;
    });

    // Add static methods with proper implementations
    mockConstructor.findOne = jest.fn((query) => {
      const email = query?.email?.$regex ? query.email.$regex.source.toLowerCase() : query?.email?.toLowerCase();
      if (email) {
        for (const customer of savedCustomers.values()) {
          if (customer.email?.toLowerCase() === email) {
            return createMockQuery(customer);
          }
        }
      }
      return createMockQuery(null);
    });

    mockConstructor.findById = jest.fn((id) => {
      const customer = savedCustomers.get(id);
      return createMockQuery(customer || null);
    });

    mockConstructor.find = jest.fn((query = {}) => {
      const results = Array.from(savedCustomers.values());
      return createMockQuery(results);
    });

    mockConstructor.findByIdAndUpdate = jest.fn((id, update) => {
      const customer = savedCustomers.get(id);
      if (customer) {
        Object.assign(customer, update.$set || update);
        return createMockQuery(customer);
      }
      return createMockQuery(null);
    });

    mockConstructor.findByIdAndDelete = jest.fn((id) => {
      const customer = savedCustomers.get(id);
      if (customer) {
        savedCustomers.delete(id);
        return createMockQuery(customer);
      }
      return createMockQuery(null);
    });

    mockConstructor.countDocuments = jest.fn().mockResolvedValue(savedCustomers.size);
    mockConstructor.aggregate = jest.fn().mockResolvedValue([]);

    // Add reference to saved customers for test inspection
    mockConstructor._savedCustomers = savedCustomers;
    mockConstructor._resetCounter = () => { idCounter = 0; savedCustomers.clear(); };

    return mockConstructor;
  };

  beforeEach(async () => {
    // Create fresh mock model for each test
    mockCustomerModel = createMockCustomerModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken(CustomerSchema.name),
          useValue: mockCustomerModel
        }
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701'
      },
      type: 'residential',
      source: 'website',
      preferredContactMethod: 'email',
      communicationPreferences: {
        allowMarketing: true,
        allowSms: true,
        allowEmail: true
      },
      leadScore: 75,
      tags: ['hot-lead']
    };

    it('should create a customer successfully', async () => {
      const result = await service.create(createCustomerDto, 'user123');

      expect(result).toMatchObject({
        id: 'uuid-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: 'lead', // Default status
        createdBy: 'user123'
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.estimates).toEqual([]);
      expect(result.jobs).toEqual([]);
    });

    it('should set default communication preferences when not provided', async () => {
      const dtoWithoutPrefs = { ...createCustomerDto };
      delete dtoWithoutPrefs.communicationPreferences;

      const result = await service.create(dtoWithoutPrefs, 'user123');

      expect(result.communicationPreferences).toEqual({
        allowMarketing: true,
        allowSms: true,
        allowEmail: true
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      // Add a customer first
      await service.create(createCustomerDto, 'user123');

      // Try to add another customer with the same email
      const duplicateDto = { ...createCustomerDto, firstName: 'Jane' };

      await expect(service.create(duplicateDto, 'user123')).rejects.toThrow(
        new ConflictException('Customer with this email already exists')
      );
    });

    it('should handle case-insensitive email duplication', async () => {
      await service.create(createCustomerDto, 'user123');

      const upperCaseEmailDto = {
        ...createCustomerDto,
        email: 'JOHN.DOE@EXAMPLE.COM'
      };

      await expect(service.create(upperCaseEmailDto, 'user123')).rejects.toThrow(ConflictException);
    });

    it('should create commercial customer with company details', async () => {
      const commercialDto: CreateCustomerDto = {
        ...createCustomerDto,
        type: 'commercial',
        companyName: 'Test Company',
        businessLicense: 'BL789'
      };

      const result = await service.create(commercialDto, 'user123');

      expect(result.type).toBe('commercial');
      expect(result.companyName).toBe('Test Company');
      expect(result.businessLicense).toBe('BL789');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Add test customers
      await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email',
        leadScore: 75,
        tags: ['hot-lead']
      }, 'user123');

      await service.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@company.com',
        phone: '555-2222',
        address: { street: '456 Ave', city: 'Chicago', state: 'IL', zipCode: '60602' },
        type: 'commercial',
        source: 'referral',
        preferredContactMethod: 'phone',
        companyName: 'Smith Corp',
        leadScore: 90
      }, 'user123');
    });

    it('should return all customers when no filters applied', async () => {
      const result = await service.findAll();

      expect(result).toHaveLength(2);
      // Check that both customers are present (order may vary)
      const firstNames = result.map(c => c.firstName).sort();
      expect(firstNames).toEqual(['Jane', 'John']);
    });

    it('should filter by status', async () => {
      // Update one customer status
      const customers = await service.findAll();
      await service.update(customers[0].id, { status: 'active' }, 'user123');

      const filters: CustomerFilters = { status: 'active' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });

    it('should filter by type', async () => {
      const filters: CustomerFilters = { type: 'commercial' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('commercial');
      expect(result[0].companyName).toBe('Smith Corp');
    });

    it('should filter by source', async () => {
      const filters: CustomerFilters = { source: 'website' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('website');
    });

    it('should filter by lead score range', async () => {
      const filters: CustomerFilters = { leadScoreMin: 80 };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].leadScore).toBe(90);
    });

    it('should filter by tags', async () => {
      const filters: CustomerFilters = { tags: ['hot-lead'] };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('hot-lead');
    });

    it('should search across multiple fields', async () => {
      const filters: CustomerFilters = { search: 'smith' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].lastName).toBe('Smith');
    });

    it('should search by phone number', async () => {
      const filters: CustomerFilters = { search: '555-1111' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].phone).toBe('555-1111');
    });

    it('should search by company name', async () => {
      const filters: CustomerFilters = { search: 'corp' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('Smith Corp');
    });

    it('should filter by creation date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filters: CustomerFilters = {
        createdAfter: yesterday,
        createdBefore: tomorrow
      };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(2); // Both created today
    });
  });

  describe('findOne', () => {
    it('should return customer by ID', async () => {
      const created = await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');

      const result = await service.findOne(created.id);

      expect(result).toMatchObject({
        id: created.id,
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Customer with ID non-existent-id not found')
      );
    });
  });

  describe('findByEmail', () => {
    it('should return customer by email', async () => {
      const created = await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');

      const result = await service.findByEmail('john@example.com');

      expect(result).toMatchObject({
        id: created.id,
        email: 'john@example.com'
      });
    });

    it('should handle case-insensitive email search', async () => {
      await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');

      const result = await service.findByEmail('JOHN@EXAMPLE.COM');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('john@example.com');
    });

    it('should return null for non-existent email', async () => {
      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    let customerId: string;

    beforeEach(async () => {
      const created = await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email',
        communicationPreferences: {
          allowMarketing: true,
          allowSms: false,
          allowEmail: true
        }
      }, 'user123');
      customerId = created.id;
    });

    it('should update customer successfully', async () => {
      const updateDto: UpdateCustomerDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'active',
        leadScore: 95
      };

      const result = await service.update(customerId, updateDto, 'updater123');

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.status).toBe('active');
      expect(result.leadScore).toBe(95);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should merge address fields correctly', async () => {
      const updateDto: UpdateCustomerDto = {
        address: {
          street: '456 New Street',
          zipCode: '60602'
        }
      };

      const result = await service.update(customerId, updateDto, 'updater123');

      expect(result.address).toEqual({
        street: '456 New Street',
        city: 'City',      // Original value
        state: 'IL',       // Original value
        zipCode: '60602'   // Updated value
      });
    });

    it('should merge communication preferences correctly', async () => {
      const updateDto: UpdateCustomerDto = {
        communicationPreferences: {
          allowMarketing: false
          // allowSms and allowEmail should retain original values
        }
      };

      const result = await service.update(customerId, updateDto, 'updater123');

      expect(result.communicationPreferences).toEqual({
        allowMarketing: false, // Updated
        allowSms: false,       // Original
        allowEmail: true       // Original
      });
    });

    it('should merge referredBy information correctly', async () => {
      const updateDto: UpdateCustomerDto = {
        referredBy: {
          partnerName: 'New Partner',
          source: 'partner'
        }
      };

      const result = await service.update(customerId, updateDto, 'updater123');

      expect(result.referredBy).toEqual({
        partnerName: 'New Partner',
        source: 'partner'
      });
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      const updateDto: UpdateCustomerDto = { firstName: 'Updated' };

      await expect(service.update('non-existent', updateDto, 'updater123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should check for email conflicts during update', async () => {
      // Create another customer
      await service.create({
        firstName: 'Other',
        lastName: 'Customer',
        email: 'other@example.com',
        phone: '555-2222',
        address: { street: '789 St', city: 'City', state: 'IL', zipCode: '60603' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');

      const updateDto: UpdateCustomerDto = {
        email: 'other@example.com' // Conflict with existing customer
      };

      await expect(service.update(customerId, updateDto, 'updater123')).rejects.toThrow(
        ConflictException
      );
    });

    it('should allow updating to same email (no conflict)', async () => {
      const updateDto: UpdateCustomerDto = {
        email: 'john@example.com', // Same email as current
        firstName: 'Updated John'
      };

      const result = await service.update(customerId, updateDto, 'updater123');

      expect(result.firstName).toBe('Updated John');
      expect(result.email).toBe('john@example.com');
    });
  });

  describe('remove', () => {
    it('should remove customer successfully', async () => {
      const created = await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');

      await service.remove(created.id);

      // Should throw NotFoundException when trying to find removed customer
      await expect(service.findOne(created.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('relationship management', () => {
    let customerId: string;

    beforeEach(async () => {
      const created = await service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');
      customerId = created.id;
    });

    it('should add estimate to customer', async () => {
      const result = await service.addEstimate(customerId, 'estimate123');

      expect(result.estimates).toContain('estimate123');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should not add duplicate estimate', async () => {
      await service.addEstimate(customerId, 'estimate123');
      const result = await service.addEstimate(customerId, 'estimate123');

      expect(result.estimates).toEqual(['estimate123']); // No duplicates
    });

    it('should add job to customer', async () => {
      const result = await service.addJob(customerId, 'job123');

      expect(result.jobs).toContain('job123');
    });

    it('should not add duplicate job', async () => {
      await service.addJob(customerId, 'job123');
      const result = await service.addJob(customerId, 'job123');

      expect(result.jobs).toEqual(['job123']); // No duplicates
    });

    it('should update last contact date', async () => {
      const beforeUpdate = new Date();

      const result = await service.updateLastContact(customerId);

      expect(result.lastContactDate).toBeInstanceOf(Date);
      expect(result.lastContactDate!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      // Create test customers with different statuses and types
      await service.create({
        firstName: 'Lead',
        lastName: 'Customer',
        email: 'lead@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      }, 'user123');

      const activeCustomer = await service.create({
        firstName: 'Active',
        lastName: 'Customer',
        email: 'active@example.com',
        phone: '555-2222',
        address: { street: '456 St', city: 'City', state: 'IL', zipCode: '60602' },
        type: 'commercial',
        source: 'referral',
        preferredContactMethod: 'phone'
      }, 'user123');

      await service.update(activeCustomer.id, { status: 'active' }, 'user123');

      // Create an older customer (simulate by manipulating date)
      const oldCustomer = await service.create({
        firstName: 'Old',
        lastName: 'Customer',
        email: 'old@example.com',
        phone: '555-3333',
        address: { street: '789 St', city: 'City', state: 'IL', zipCode: '60603' },
        type: 'residential',
        source: 'advertising',
        preferredContactMethod: 'email'
      }, 'user123');

      // Manually set creation date to 31 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      (service as any).customers.set(oldCustomer.id, {
        ...(service as any).customers.get(oldCustomer.id),
        createdAt: oldDate
      });
    });

    it('should calculate customer statistics correctly', async () => {
      const stats = await service.getCustomerStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus).toEqual({
        lead: 2,
        active: 1
      });
      expect(stats.byType).toEqual({
        residential: 2,
        commercial: 1
      });
      expect(stats.bySource).toEqual({
        website: 1,
        referral: 1,
        advertising: 1
      });
      expect(stats.recentlyCreated).toBe(2); // Only customers created in last 30 days
    });

    it('should handle empty customer database', async () => {
      // Clear all customers
      (service as any).customers.clear();

      const stats = await service.getCustomerStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.byType).toEqual({});
      expect(stats.bySource).toEqual({});
      expect(stats.recentlyCreated).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle UUID generation fallback', async () => {
      // This test verifies that the service generates valid IDs
      // The actual UUID generation is mocked at the module level
      const createCustomerDto: CreateCustomerDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      };

      const result = await service.create(createCustomerDto, 'user123');

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
      expect(typeof result.id).toBe('string');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalDto: CreateCustomerDto = {
        firstName: 'Minimal',
        lastName: 'Customer',
        email: 'minimal@example.com',
        phone: '555-1111',
        address: { street: '123 St', city: 'City', state: 'IL', zipCode: '60601' },
        type: 'residential',
        source: 'website',
        preferredContactMethod: 'email'
      };

      const result = await service.create(minimalDto, 'user123');

      expect(result.companyName).toBeUndefined();
      expect(result.businessLicense).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.leadScore).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.referredBy).toBeUndefined();
    });
  });
});