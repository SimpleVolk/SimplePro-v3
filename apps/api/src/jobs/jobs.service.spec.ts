import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { RealtimeService } from '../websocket/realtime.service';
import { TransactionService } from '../database/transaction.service';
import { CacheService } from '../cache/cache.service';
import { Job as JobSchema } from './schemas/job.schema';
import {
  CreateJobDto,
  UpdateJobDto,
  JobFilters,
  InternalNote,
} from './interfaces/job.interface';

describe('JobsService', () => {
  let service: JobsService;
  let mockRealtimeService: jest.Mocked<RealtimeService>;

  const mockRealtimeServiceImplementation = {
    notifyJobStatusChange: jest.fn(),
    notifyJobCompletion: jest.fn(),
    // Add other methods as needed
  };

  const mockTransactionService = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    withTransaction: jest.fn().mockImplementation(async (callback) => {
      return await callback();
    }),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
    invalidatePattern: jest.fn(),
  };

  // Create mock Job model
  const createMockJobModel = () => {
    const mockConstructor: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: `job_${Math.random().toString(36).substr(2, 9)}`,
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: `job_${Math.random().toString(36).substr(2, 9)}`,
      }),
    }));

    // Add static methods
    mockConstructor.find = jest.fn();
    mockConstructor.findById = jest.fn();
    mockConstructor.findByIdAndUpdate = jest.fn();
    mockConstructor.findOne = jest.fn();
    mockConstructor.countDocuments = jest.fn();
    mockConstructor.aggregate = jest.fn();

    return mockConstructor;
  };

  let mockJobModel: any;

  const mockCreateJobDto: CreateJobDto = {
    title: 'Residential Move',
    description: 'Moving from apartment to house',
    type: 'local',
    priority: 'normal',
    customerId: 'customer123',
    estimateId: 'estimate123',
    scheduledDate: new Date('2024-02-15T00:00:00Z'),
    scheduledStartTime: '08:00',
    scheduledEndTime: '16:00',
    estimatedDuration: 8,
    pickupAddress: {
      street: '123 Apartment St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      contactPerson: 'John Doe',
      contactPhone: '555-1234',
    },
    deliveryAddress: {
      street: '456 House Ave',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702',
      contactPerson: 'John Doe',
      contactPhone: '555-1234',
    },
    assignedCrew: [
      {
        crewMemberId: 'crew123',
        role: 'lead',
        hourlyRate: 25,
      },
      {
        crewMemberId: 'crew456',
        role: 'mover',
        hourlyRate: 20,
      },
    ],
    inventory: [
      {
        name: 'Sofa',
        category: 'furniture',
        quantity: 1,
        weight: 150,
        volume: 80,
        condition: 'good',
        location: 'pickup',
      },
    ],
    services: [
      {
        type: 'loading',
        description: 'Load items from apartment',
      },
      {
        type: 'unloading',
        description: 'Unload items at house',
      },
    ],
    equipment: [
      {
        type: 'truck',
        description: 'Moving truck - 26ft',
        quantity: 1,
      },
      {
        type: 'dolly',
        description: 'Furniture dolly',
        quantity: 2,
      },
    ],
    estimatedCost: 800,
    specialInstructions: 'Handle antique furniture with care',
  };

  beforeEach(async () => {
    // Create fresh mock model for each test
    mockJobModel = createMockJobModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getModelToken(JobSchema.name),
          useValue: mockJobModel,
        },
        {
          provide: RealtimeService,
          useValue: mockRealtimeServiceImplementation,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    mockRealtimeService = module.get(
      RealtimeService,
    ) as jest.Mocked<RealtimeService>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a job successfully', async () => {
      const result = await service.create(mockCreateJobDto, 'user123');

      expect(result).toMatchObject({
        title: 'Residential Move',
        description: 'Moving from apartment to house',
        type: 'local',
        status: 'scheduled',
        priority: 'normal',
        customerId: 'customer123',
        estimateId: 'estimate123',
        estimatedCost: 800,
        createdBy: 'user123',
      });

      expect(result.id).toBeDefined();
      expect(result.jobNumber).toMatch(/^JOB-\d{4}-\d{4}$/);
      expect(result.assignedCrew).toHaveLength(2);
      expect(result.assignedCrew[0].status).toBe('assigned');
      expect(result.assignedCrew[0].assignedAt).toBeInstanceOf(Date);
      expect(result.leadCrew).toBe('crew123');
      expect(result.milestones.length).toBeGreaterThan(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique job numbers', async () => {
      const job1 = await service.create(mockCreateJobDto, 'user123');
      const job2 = await service.create(mockCreateJobDto, 'user123');

      expect(job1.jobNumber).not.toBe(job2.jobNumber);
      expect(job1.jobNumber).toMatch(/JOB-\d{4}-0001/);
      expect(job2.jobNumber).toMatch(/JOB-\d{4}-0002/);
    });

    it('should create default milestones based on job type', async () => {
      const result = await service.create(mockCreateJobDto, 'user123');

      const expectedMilestones = [
        'Job Preparation',
        'Arrival at Pickup',
        'Loading Started',
        'Loading Completed',
        'Arrival at Delivery',
        'Unloading Started',
        'Unloading Completed',
        'Job Completed',
      ];

      expect(result.milestones).toHaveLength(expectedMilestones.length);
      expectedMilestones.forEach((milestoneName, index) => {
        expect(result.milestones[index].name).toBe(milestoneName);
        expect(result.milestones[index].status).toBe('pending');
      });
    });

    it('should create additional milestone for long distance jobs', async () => {
      const longDistanceDto = {
        ...mockCreateJobDto,
        type: 'long_distance' as const,
      };
      const result = await service.create(longDistanceDto, 'user123');

      const inTransitMilestone = result.milestones.find(
        (m) => m.name === 'In Transit',
      );
      expect(inTransitMilestone).toBeDefined();
    });

    it('should throw BadRequestException for missing customer ID', async () => {
      const invalidDto = { ...mockCreateJobDto, customerId: '' };

      await expect(service.create(invalidDto, 'user123')).rejects.toThrow(
        new BadRequestException('Customer ID is required'),
      );
    });

    it('should handle job creation without optional fields', async () => {
      const minimalDto: CreateJobDto = {
        title: 'Basic Move',
        type: 'local',
        customerId: 'customer123',
        scheduledDate: new Date('2024-02-15'),
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        estimatedDuration: 8,
        pickupAddress: {
          street: '123 St',
          city: 'City',
          state: 'ST',
          zipCode: '12345',
        },
        deliveryAddress: {
          street: '456 Ave',
          city: 'City',
          state: 'ST',
          zipCode: '12346',
        },
        estimatedCost: 500,
      };

      const result = await service.create(minimalDto, 'user123');

      expect(result.assignedCrew).toHaveLength(0);
      expect(result.inventory).toHaveLength(0);
      expect(result.services).toHaveLength(0);
      expect(result.equipment).toHaveLength(0);
      expect(result.priority).toBe('normal'); // Default value
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test jobs
      await service.create(mockCreateJobDto, 'user123');
      await service.create(
        {
          ...mockCreateJobDto,
          title: 'Commercial Move',
          type: 'long_distance',
          priority: 'high',
          customerId: 'customer456',
        },
        'user123',
      );
    });

    it('should return all jobs when no filters applied', async () => {
      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Commercial Move'); // Most recent first
      expect(result[1].title).toBe('Residential Move');
    });

    it('should filter by status', async () => {
      const jobs = await service.findAll();
      await service.updateStatus(jobs[0].id, 'in_progress', 'user123');

      const filters: JobFilters = { status: 'in_progress' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('in_progress');
    });

    it('should filter by type', async () => {
      const filters: JobFilters = { type: 'long_distance' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('long_distance');
    });

    it('should filter by priority', async () => {
      const filters: JobFilters = { priority: 'high' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high');
    });

    it('should filter by customer ID', async () => {
      const filters: JobFilters = { customerId: 'customer123' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe('customer123');
    });

    it('should filter by assigned crew', async () => {
      const filters: JobFilters = { assignedCrew: 'crew123' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(
        result[0].assignedCrew.some((c) => c.crewMemberId === 'crew123'),
      ).toBe(true);
    });

    it('should filter by date range', async () => {
      const yesterday = new Date('2024-02-14');
      const tomorrow = new Date('2024-02-16');

      const filters: JobFilters = {
        scheduledAfter: yesterday,
        scheduledBefore: tomorrow,
      };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(2); // Both jobs are on 2024-02-15
    });

    it('should search by title, description, and job number', async () => {
      const filters: JobFilters = { search: 'residential' };
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Residential Move');
    });
  });

  describe('findOne', () => {
    it('should return job by ID', async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      const result = await service.findOne(created.id);

      expect(result).toMatchObject({
        id: created.id,
        title: 'Residential Move',
      });
    });

    it('should throw NotFoundException for non-existent job', async () => {
      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Job with ID non-existent not found'),
      );
    });
  });

  describe('findByJobNumber', () => {
    it('should return job by job number', async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      const result = await service.findByJobNumber(created.jobNumber);

      expect(result).toMatchObject({
        id: created.id,
        jobNumber: created.jobNumber,
      });
    });

    it('should return null for non-existent job number', async () => {
      const result = await service.findByJobNumber('NON-EXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    let jobId: string;

    beforeEach(async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      jobId = created.id;
    });

    it('should update job successfully', async () => {
      const updateDto: UpdateJobDto = {
        title: 'Updated Move',
        priority: 'high',
        estimatedCost: 1000,
        specialInstructions: 'Updated instructions',
      };

      const result = await service.update(jobId, updateDto, 'updater123');

      expect(result.title).toBe('Updated Move');
      expect(result.priority).toBe('high');
      expect(result.estimatedCost).toBe(1000);
      expect(result.specialInstructions).toBe('Updated instructions');
      expect(result.lastModifiedBy).toBe('updater123');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should merge address fields correctly', async () => {
      const updateDto: UpdateJobDto = {
        pickupAddress: {
          street: '789 New Street',
          accessNotes: 'Use side entrance',
        },
      };

      const result = await service.update(jobId, updateDto, 'updater123');

      expect(result.pickupAddress).toEqual({
        street: '789 New Street',
        city: 'Springfield', // Original value
        state: 'IL', // Original value
        zipCode: '62701', // Original value
        contactPerson: 'John Doe', // Original value
        contactPhone: '555-1234', // Original value
        accessNotes: 'Use side entrance', // New value
      });
    });

    it('should throw NotFoundException for non-existent job', async () => {
      const updateDto: UpdateJobDto = { title: 'Updated' };

      await expect(
        service.update('non-existent', updateDto, 'updater123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    let jobId: string;

    beforeEach(async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      jobId = created.id;
    });

    it('should update status to in_progress and set actual start time', async () => {
      const result = await service.updateStatus(
        jobId,
        'in_progress',
        'dispatcher123',
      );

      expect(result.status).toBe('in_progress');
      expect(result.actualStartTime).toBeInstanceOf(Date);
      expect(result.lastModifiedBy).toBe('dispatcher123');
    });

    it('should update status to completed and set actual end time', async () => {
      // First set to in_progress
      await service.updateStatus(jobId, 'in_progress', 'dispatcher123');

      const result = await service.updateStatus(
        jobId,
        'completed',
        'dispatcher123',
      );

      expect(result.status).toBe('completed');
      expect(result.actualEndTime).toBeInstanceOf(Date);
    });

    it('should send real-time notifications on status change', async () => {
      await service.updateStatus(jobId, 'in_progress', 'dispatcher123');

      expect(mockRealtimeService.notifyJobStatusChange).toHaveBeenCalledWith(
        jobId,
        'in_progress',
        'dispatcher123',
      );
    });

    it('should send job completion notification when completed', async () => {
      await service.updateStatus(jobId, 'completed', 'dispatcher123');

      expect(mockRealtimeService.notifyJobCompletion).toHaveBeenCalledWith(
        jobId,
        'crew123', // First crew member ID
        'dispatcher123',
      );
    });

    it('should not set actual start time if already set', async () => {
      const job = await service.findOne(jobId);
      const customStartTime = new Date('2024-02-15T10:30:00Z');

      // Manually set actual start time
      (service as any).jobs.set(jobId, {
        ...job,
        actualStartTime: customStartTime,
      });

      const result = await service.updateStatus(
        jobId,
        'in_progress',
        'dispatcher123',
      );

      expect(result.actualStartTime).toEqual(customStartTime);
    });
  });

  describe('remove', () => {
    it('should remove job successfully', async () => {
      const created = await service.create(mockCreateJobDto, 'user123');

      await service.remove(created.id);

      await expect(service.findOne(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for in-progress job', async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      await service.updateStatus(created.id, 'in_progress', 'user123');

      await expect(service.remove(created.id)).rejects.toThrow(
        new BadRequestException('Cannot delete job that is in progress'),
      );
    });

    it('should throw NotFoundException for non-existent job', async () => {
      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('crew management', () => {
    let jobId: string;

    beforeEach(async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      jobId = created.id;
    });

    it('should assign additional crew members', async () => {
      const newAssignments = [
        {
          crewMemberId: 'crew789',
          role: 'mover' as const,
          hourlyRate: 18,
        },
      ];

      const result = await service.assignCrew(
        jobId,
        newAssignments,
        'dispatcher123',
      );

      expect(result.assignedCrew).toHaveLength(3); // Original 2 + 1 new
      expect(result.assignedCrew[2].crewMemberId).toBe('crew789');
      expect(result.assignedCrew[2].status).toBe('assigned');
      expect(result.assignedCrew[2].assignedAt).toBeInstanceOf(Date);
      expect(result.lastModifiedBy).toBe('dispatcher123');
    });

    it('should update crew status to checked_in', async () => {
      const result = await service.updateCrewStatus(
        jobId,
        'crew123',
        'checked_in',
        'crew123',
      );

      const leadCrew = result.assignedCrew.find(
        (c) => c.crewMemberId === 'crew123',
      );
      expect(leadCrew?.status).toBe('checked_in');
      expect(leadCrew?.checkInTime).toBeInstanceOf(Date);
    });

    it('should update crew status to checked_out and calculate hours worked', async () => {
      // First check in
      await service.updateCrewStatus(jobId, 'crew123', 'checked_in', 'crew123');

      // Then check out
      const result = await service.updateCrewStatus(
        jobId,
        'crew123',
        'checked_out',
        'crew123',
      );

      const leadCrew = result.assignedCrew.find(
        (c) => c.crewMemberId === 'crew123',
      );
      expect(leadCrew?.status).toBe('checked_out');
      expect(leadCrew?.checkOutTime).toBeInstanceOf(Date);
      expect(leadCrew?.hoursWorked).toBeGreaterThan(0);
    });
  });

  describe('notes management', () => {
    let jobId: string;

    beforeEach(async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      jobId = created.id;
    });

    it('should add internal note', async () => {
      const note: Omit<InternalNote, 'id' | 'createdAt'> = {
        content: 'Customer requested early start time',
        category: 'customer',
        isImportant: true,
        createdBy: 'dispatcher123',
      };

      const result = await service.addNote(jobId, note, 'dispatcher123');

      expect(result.internalNotes).toHaveLength(1);
      expect(result.internalNotes[0].content).toBe(
        'Customer requested early start time',
      );
      expect(result.internalNotes[0].category).toBe('customer');
      expect(result.internalNotes[0].isImportant).toBe(true);
      expect(result.internalNotes[0].id).toBeDefined();
      expect(result.internalNotes[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('milestone management', () => {
    let jobId: string;
    let milestoneId: string;

    beforeEach(async () => {
      const created = await service.create(mockCreateJobDto, 'user123');
      jobId = created.id;
      milestoneId = created.milestones[0].id;
    });

    it('should update milestone status to completed', async () => {
      const result = await service.updateMilestone(
        jobId,
        milestoneId,
        'completed',
        'crew123',
      );

      const milestone = result.milestones.find((m) => m.id === milestoneId);
      expect(milestone?.status).toBe('completed');
      expect(milestone?.completedAt).toBeInstanceOf(Date);
      expect(milestone?.completedBy).toBe('crew123');
    });

    it('should update milestone status without completion info', async () => {
      const result = await service.updateMilestone(
        jobId,
        milestoneId,
        'in_progress',
      );

      const milestone = result.milestones.find((m) => m.id === milestoneId);
      expect(milestone?.status).toBe('in_progress');
      expect(milestone?.completedAt).toBeUndefined();
      expect(milestone?.completedBy).toBeUndefined();
    });
  });

  describe('analytics and statistics', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      // Create jobs with different statuses and dates
      const job1 = await service.create(
        {
          ...mockCreateJobDto,
          scheduledDate: today,
          estimatedCost: 800,
        },
        'user123',
      );

      const job2 = await service.create(
        {
          ...mockCreateJobDto,
          title: 'Commercial Move',
          type: 'long_distance',
          priority: 'high',
          scheduledDate: today,
          estimatedCost: 1500,
        },
        'user123',
      );

      await service.create(
        {
          ...mockCreateJobDto,
          title: 'Overdue Job',
          scheduledDate: yesterday,
          estimatedCost: 600,
        },
        'user123',
      );

      // Update statuses
      await service.updateStatus(job1.id, 'in_progress', 'user123');
      await service.updateStatus(job2.id, 'completed', 'user123');

      // Add actual cost to completed job
      await service.update(job2.id, { actualCost: 1600 }, 'user123');
    });

    it('should calculate job statistics correctly', async () => {
      const stats = await service.getJobStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus).toEqual({
        scheduled: 1,
        in_progress: 1,
        completed: 1,
      });
      expect(stats.byType).toEqual({
        local: 3,
      });
      expect(stats.byPriority).toEqual({
        normal: 2,
        high: 1,
      });
      expect(stats.scheduledToday).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.totalRevenue).toBe(1600); // Only from completed job with actual cost
    });

    it('should handle empty job database', async () => {
      // Clear all jobs
      (service as any).jobs.clear();

      const stats = await service.getJobStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.totalRevenue).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('getJobsByDate', () => {
    beforeEach(async () => {
      const testDate = new Date('2024-02-15');
      const otherDate = new Date('2024-02-16');

      await service.create(
        {
          ...mockCreateJobDto,
          scheduledDate: testDate,
          scheduledStartTime: '08:00',
        },
        'user123',
      );

      await service.create(
        {
          ...mockCreateJobDto,
          title: 'Second Job',
          scheduledDate: testDate,
          scheduledStartTime: '14:00',
        },
        'user123',
      );

      await service.create(
        {
          ...mockCreateJobDto,
          title: 'Other Day Job',
          scheduledDate: otherDate,
        },
        'user123',
      );
    });

    it('should return jobs for specific date sorted by start time', async () => {
      const testDate = new Date('2024-02-15');
      const result = await service.getJobsByDate(testDate);

      expect(result).toHaveLength(2);
      expect(result[0].scheduledStartTime).toBe('08:00');
      expect(result[1].scheduledStartTime).toBe('14:00');
      expect(result[1].title).toBe('Second Job');
    });

    it('should return empty array for date with no jobs', async () => {
      const emptyDate = new Date('2024-02-20');
      const result = await service.getJobsByDate(emptyDate);

      expect(result).toHaveLength(0);
    });
  });

  describe('ID generation methods', () => {
    it('should generate unique IDs', () => {
      const id1 = (service as any).generateId();
      const id2 = (service as any).generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('job_')).toBe(true);
      expect(id2.startsWith('job_')).toBe(true);
    });

    it('should generate sequential job numbers', () => {
      const jobNumber1 = (service as any).generateJobNumber();
      const jobNumber2 = (service as any).generateJobNumber();

      const currentYear = new Date().getFullYear();
      expect(jobNumber1).toBe(`JOB-${currentYear}-0001`);
      expect(jobNumber2).toBe(`JOB-${currentYear}-0002`);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle crew status update for non-existent crew member', async () => {
      const created = await service.create(mockCreateJobDto, 'user123');

      const result = await service.updateCrewStatus(
        created.id,
        'non-existent-crew',
        'checked_in',
        'user123',
      );

      // Should not change anything if crew member not found
      expect(result.assignedCrew.every((c) => c.status === 'assigned')).toBe(
        true,
      );
    });

    it('should handle milestone update for non-existent milestone', async () => {
      const created = await service.create(mockCreateJobDto, 'user123');

      const result = await service.updateMilestone(
        created.id,
        'non-existent-milestone',
        'completed',
        'user123',
      );

      // Should not change anything if milestone not found
      expect(result.milestones.every((m) => m.status === 'pending')).toBe(true);
    });

    it('should create jobs without real-time service gracefully', async () => {
      // Create service without realtime service
      const moduleWithoutRealtime: TestingModule =
        await Test.createTestingModule({
          providers: [
            JobsService,
            {
              provide: getModelToken(JobSchema.name),
              useValue: createMockJobModel(),
            },
            {
              provide: RealtimeService,
              useValue: null,
            },
            {
              provide: TransactionService,
              useValue: mockTransactionService,
            },
            {
              provide: CacheService,
              useValue: mockCacheService,
            },
          ],
        }).compile();

      const serviceWithoutRealtime =
        moduleWithoutRealtime.get<JobsService>(JobsService);
      (serviceWithoutRealtime as any).jobs.clear();

      const created = await serviceWithoutRealtime.create(
        mockCreateJobDto,
        'user123',
      );

      // Should not throw error when updating status without realtime service
      await expect(
        serviceWithoutRealtime.updateStatus(
          created.id,
          'in_progress',
          'user123',
        ),
      ).resolves.not.toThrow();
    });
  });
});
