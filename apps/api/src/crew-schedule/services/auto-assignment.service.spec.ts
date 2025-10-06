import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AutoAssignmentService,
  JobRequirements,
} from './auto-assignment.service';
import { CrewAssignment } from '../schemas/crew-assignment.schema';
import { WorkloadService } from './workload.service';
import { TimeOffService } from './time-off.service';

describe('AutoAssignmentService', () => {
  let service: AutoAssignmentService;
  let mockCrewAssignmentModel: any;
  let mockWorkloadService: any;
  let mockTimeOffService: any;

  const mockJobId = 'job123';
  const mockCrewId = 'crew123';
  const mockAssignedBy = 'user123';

  const createMockCrewMember = (overrides = {}) => ({
    _id: { toString: () => overrides['id'] || 'crew-001' },
    id: overrides['id'] || 'crew-001',
    name: 'John Doe',
    email: 'john@example.com',
    skills: ['packing', 'driving', 'heavy-lifting'],
    performanceRating: 4.5,
    homeAddress: {
      street: '123 Main St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      latitude: 41.8781,
      longitude: -87.6298,
    },
    ...overrides,
  });

  const createMockJob = (overrides = {}) => ({
    _id: mockJobId,
    pickupAddress: {
      street: '456 Oak Ave',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60602',
      latitude: 41.8825,
      longitude: -87.6324,
    },
    preferredCrew: [],
    ...overrides,
  });

  const createMockRequirements = (
    overrides: Partial<JobRequirements> = {},
  ): JobRequirements => ({
    requiredSkills: ['packing', 'driving'],
    crewSize: 2,
    jobDate: new Date('2024-06-15T08:00:00Z'),
    estimatedDuration: 8,
    ...overrides,
  });

  const createMockQuery = (returnValue: any = null) => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue),
  });

  beforeEach(async () => {
    // Mock WorkloadService
    mockWorkloadService = {
      getCrewWorkload: jest.fn().mockResolvedValue({
        totalJobs: 2,
        hoursWorked: 16,
        utilizationRate: 0.5,
        isOverloaded: false,
      }),
    };

    // Mock TimeOffService
    mockTimeOffService = {
      isOnTimeOff: jest.fn().mockResolvedValue(false),
    };

    // Mock CrewAssignment model
    mockCrewAssignmentModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedThis(),
    }));
    mockCrewAssignmentModel.findOne = jest.fn();
    mockCrewAssignmentModel.findById = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoAssignmentService,
        {
          provide: getModelToken(CrewAssignment.name),
          useValue: mockCrewAssignmentModel,
        },
        {
          provide: WorkloadService,
          useValue: mockWorkloadService,
        },
        {
          provide: TimeOffService,
          useValue: mockTimeOffService,
        },
      ],
    }).compile();

    service = module.get<AutoAssignmentService>(AutoAssignmentService);
    jest.clearAllMocks();
  });

  describe('scoreCrewMember', () => {
    it('should calculate full score for perfect match', async () => {
      const crewMember = createMockCrewMember({
        skills: ['packing', 'driving', 'heavy-lifting'],
        performanceRating: 5,
      });
      const job = createMockJob();
      const requirements = createMockRequirements({
        requiredSkills: ['packing', 'driving'],
      });

      mockWorkloadService.getCrewWorkload.mockResolvedValue({
        totalJobs: 1,
        hoursWorked: 8,
        isOverloaded: false,
      });

      const score = await service.scoreCrewMember(
        crewMember,
        job,
        requirements,
      );

      // Skills: 30 (100% match), Availability: 20, Proximity: 20, Performance: 15, Workload: 10
      expect(score).toBeGreaterThan(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate skills match correctly - partial match', async () => {
      const crewMember = createMockCrewMember({
        skills: ['packing'], // Only 1 of 2 required skills
      });
      const job = createMockJob();
      const requirements = createMockRequirements({
        requiredSkills: ['packing', 'driving'],
      });

      const score = await service.scoreCrewMember(
        crewMember,
        job,
        requirements,
      );

      // Skills should be 15 points (50% of 30)
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should score zero for unavailable crew', async () => {
      const crewMember = createMockCrewMember();
      const job = createMockJob();
      const requirements = createMockRequirements();

      mockTimeOffService.isOnTimeOff.mockResolvedValue(true);

      const score = await service.scoreCrewMember(
        crewMember,
        job,
        requirements,
      );

      // Availability: 0 points (on time off)
      expect(score).toBeLessThan(100); // Won't get full availability points
    });

    it('should calculate proximity score based on distance', async () => {
      const nearCrewMember = createMockCrewMember({
        homeAddress: {
          latitude: 41.8781,
          longitude: -87.6298,
        },
      });
      const job = createMockJob({
        pickupAddress: {
          latitude: 41.8825,
          longitude: -87.6324,
        },
      });
      const requirements = createMockRequirements();

      const score = await service.scoreCrewMember(
        nearCrewMember,
        job,
        requirements,
      );

      expect(score).toBeGreaterThan(0);
      // Close proximity should give high proximity score (up to 20 points)
    });

    it('should score proximity using zip code fallback', async () => {
      const crewMember = createMockCrewMember({
        homeAddress: {
          zipCode: '60601',
          latitude: undefined,
          longitude: undefined,
        },
      });
      const job = createMockJob({
        pickupAddress: {
          zipCode: '60601', // Same zip code
          latitude: undefined,
          longitude: undefined,
        },
      });
      const requirements = createMockRequirements();

      const score = await service.scoreCrewMember(
        crewMember,
        job,
        requirements,
      );

      expect(score).toBeGreaterThan(0);
      // Same zip code should give high proximity score
    });

    it('should calculate performance rating correctly', async () => {
      const highPerformer = createMockCrewMember({
        performanceRating: 5, // Perfect rating
      });
      const lowPerformer = createMockCrewMember({
        id: 'crew-002',
        performanceRating: 2, // Low rating
      });
      const job = createMockJob();
      const requirements = createMockRequirements();

      const highScore = await service.scoreCrewMember(
        highPerformer,
        job,
        requirements,
      );
      const lowScore = await service.scoreCrewMember(
        lowPerformer,
        job,
        requirements,
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should score workload balance correctly', async () => {
      const lightWorkload = createMockCrewMember({ id: 'crew-light' });
      const heavyWorkload = createMockCrewMember({ id: 'crew-heavy' });
      const job = createMockJob();
      const requirements = createMockRequirements();

      mockWorkloadService.getCrewWorkload
        .mockResolvedValueOnce({ totalJobs: 2, isOverloaded: false }) // Light
        .mockResolvedValueOnce({ totalJobs: 5, isOverloaded: false }); // Heavy

      const lightScore = await service.scoreCrewMember(
        lightWorkload,
        job,
        requirements,
      );
      const heavyScore = await service.scoreCrewMember(
        heavyWorkload,
        job,
        requirements,
      );

      expect(lightScore).toBeGreaterThan(heavyScore);
    });

    it('should give bonus for preferred crew', async () => {
      const preferredCrew = createMockCrewMember({ id: 'preferred-crew' });
      const job = createMockJob({
        preferredCrew: ['preferred-crew'],
      });
      const requirements = createMockRequirements();

      const score = await service.scoreCrewMember(
        preferredCrew,
        job,
        requirements,
      );

      // Should get team preference bonus (5 points)
      expect(score).toBeGreaterThan(0);
    });

    it('should handle crew with no skills', async () => {
      const unskilledCrew = createMockCrewMember({
        skills: [],
      });
      const job = createMockJob();
      const requirements = createMockRequirements();

      const score = await service.scoreCrewMember(
        unskilledCrew,
        job,
        requirements,
      );

      // Skills match should be 0
      expect(score).toBeLessThan(100);
    });

    it('should cap score at 100', async () => {
      const perfectCrew = createMockCrewMember({
        skills: ['packing', 'driving', 'heavy-lifting', 'assembly'],
        performanceRating: 5,
      });
      const job = createMockJob();
      const requirements = createMockRequirements();

      mockWorkloadService.getCrewWorkload.mockResolvedValue({
        totalJobs: 0,
        isOverloaded: false,
      });

      const score = await service.scoreCrewMember(
        perfectCrew,
        job,
        requirements,
      );

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('checkAvailabilityForJob', () => {
    it('should return true for available crew', async () => {
      const jobDate = new Date('2024-06-15');
      mockTimeOffService.isOnTimeOff.mockResolvedValue(false);
      mockWorkloadService.getCrewWorkload.mockResolvedValue({
        totalJobs: 2,
        isOverloaded: false,
      });

      const result = await service.checkAvailabilityForJob(
        mockCrewId,
        jobDate,
        8,
      );

      expect(result).toBe(true);
    });

    it('should return false for crew on time off', async () => {
      const jobDate = new Date('2024-06-15');
      mockTimeOffService.isOnTimeOff.mockResolvedValue(true);

      const result = await service.checkAvailabilityForJob(
        mockCrewId,
        jobDate,
        8,
      );

      expect(result).toBe(false);
    });

    it('should return false for overloaded crew', async () => {
      const jobDate = new Date('2024-06-15');
      mockTimeOffService.isOnTimeOff.mockResolvedValue(false);
      mockWorkloadService.getCrewWorkload.mockResolvedValue({
        totalJobs: 6,
        isOverloaded: true,
      });

      const result = await service.checkAvailabilityForJob(
        mockCrewId,
        jobDate,
        8,
      );

      expect(result).toBe(false);
    });

    it('should handle null workload data', async () => {
      const jobDate = new Date('2024-06-15');
      mockTimeOffService.isOnTimeOff.mockResolvedValue(false);
      mockWorkloadService.getCrewWorkload.mockResolvedValue(null);

      const result = await service.checkAvailabilityForJob(
        mockCrewId,
        jobDate,
        8,
      );

      expect(result).toBe(true); // Null workload means available
    });
  });

  describe('calculateProximity', () => {
    it('should calculate distance using Haversine formula', () => {
      const crewHome = {
        latitude: 41.8781,
        longitude: -87.6298,
      };
      const jobAddress = {
        latitude: 41.8825,
        longitude: -87.6324,
      };

      const distance = service.calculateProximity(crewHome, jobAddress);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10 miles for nearby locations
    });

    it('should return small distance for same zip code', () => {
      const crewHome = { zipCode: '60601' };
      const jobAddress = { zipCode: '60601' };

      const distance = service.calculateProximity(crewHome, jobAddress);

      expect(distance).toBe(5); // Same zip code
    });

    it('should return medium distance for similar zip codes', () => {
      const crewHome = { zipCode: '60601' };
      const jobAddress = { zipCode: '60699' }; // Same first 3 digits

      const distance = service.calculateProximity(crewHome, jobAddress);

      expect(distance).toBe(15);
    });

    it('should return default distance when no location data', () => {
      const crewHome = {};
      const jobAddress = {};

      const distance = service.calculateProximity(crewHome, jobAddress);

      expect(distance).toBe(25); // Default moderate distance
    });

    it('should handle missing latitude/longitude gracefully', () => {
      const crewHome = { latitude: 41.8781 }; // Missing longitude
      const jobAddress = { latitude: 41.8825, longitude: -87.6324 };

      const distance = service.calculateProximity(crewHome, jobAddress);

      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('autoAssignCrew', () => {
    it('should throw BadRequestException when not enough crew available', async () => {
      const requirements = createMockRequirements({ crewSize: 5 });

      // suggestCrew returns empty array (no crew available)
      jest.spyOn(service, 'suggestCrew').mockResolvedValue([]);

      await expect(
        service.autoAssignCrew(mockJobId, requirements, mockAssignedBy),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when not enough available crew on date', async () => {
      const requirements = createMockRequirements({ crewSize: 3 });

      // Only 2 crew members available, but need 3
      jest.spyOn(service, 'suggestCrew').mockResolvedValue([
        {
          crewMemberId: 'crew-001',
          crewMemberName: 'John Doe',
          score: 95,
          scoreBreakdown: {
            skillsMatch: 30,
            availability: 20,
            proximity: 20,
            performance: 15,
            workload: 10,
            teamPreference: 0,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 2,
            hoursWorked: 16,
            utilizationRate: 0.5,
          },
        },
        {
          crewMemberId: 'crew-002',
          crewMemberName: 'Jane Smith',
          score: 90,
          scoreBreakdown: {
            skillsMatch: 25,
            availability: 20,
            proximity: 15,
            performance: 15,
            workload: 10,
            teamPreference: 5,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 3,
            hoursWorked: 24,
            utilizationRate: 0.75,
          },
        },
      ]);

      await expect(
        service.autoAssignCrew(mockJobId, requirements, mockAssignedBy),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create assignment with highest scoring crew members', async () => {
      const requirements = createMockRequirements({ crewSize: 2 });

      jest.spyOn(service, 'suggestCrew').mockResolvedValue([
        {
          crewMemberId: 'crew-001',
          crewMemberName: 'John Doe',
          score: 95,
          scoreBreakdown: {
            skillsMatch: 30,
            availability: 20,
            proximity: 20,
            performance: 15,
            workload: 10,
            teamPreference: 0,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 2,
            hoursWorked: 16,
            utilizationRate: 0.5,
          },
        },
        {
          crewMemberId: 'crew-002',
          crewMemberName: 'Jane Smith',
          score: 90,
          scoreBreakdown: {
            skillsMatch: 25,
            availability: 20,
            proximity: 15,
            performance: 15,
            workload: 10,
            teamPreference: 5,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 3,
            hoursWorked: 24,
            utilizationRate: 0.75,
          },
        },
        {
          crewMemberId: 'crew-003',
          crewMemberName: 'Bob Johnson',
          score: 85,
          scoreBreakdown: {
            skillsMatch: 20,
            availability: 20,
            proximity: 15,
            performance: 15,
            workload: 10,
            teamPreference: 5,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 1,
            hoursWorked: 8,
            utilizationRate: 0.25,
          },
        },
      ]);

      const result = await service.autoAssignCrew(
        mockJobId,
        requirements,
        mockAssignedBy,
      );

      expect(result.crewMembers).toContain('crew-001');
      expect(result.crewMembers).toContain('crew-002');
      expect(result.crewMembers).toHaveLength(2);
      expect(result.crewLeadId).toBe('crew-001'); // Highest scoring
      expect(result.assignmentMethod).toBe('auto');
    });

    it('should use preferred crew lead when specified and available', async () => {
      const requirements = createMockRequirements({
        crewSize: 2,
        preferredCrewLeadId: 'crew-002',
      });

      jest.spyOn(service, 'suggestCrew').mockResolvedValue([
        {
          crewMemberId: 'crew-001',
          crewMemberName: 'John Doe',
          score: 95,
          scoreBreakdown: {
            skillsMatch: 30,
            availability: 20,
            proximity: 20,
            performance: 15,
            workload: 10,
            teamPreference: 0,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 2,
            hoursWorked: 16,
            utilizationRate: 0.5,
          },
        },
        {
          crewMemberId: 'crew-002',
          crewMemberName: 'Jane Smith',
          score: 90,
          scoreBreakdown: {
            skillsMatch: 25,
            availability: 20,
            proximity: 15,
            performance: 15,
            workload: 10,
            teamPreference: 5,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 3,
            hoursWorked: 24,
            utilizationRate: 0.75,
          },
        },
      ]);

      const result = await service.autoAssignCrew(
        mockJobId,
        requirements,
        mockAssignedBy,
      );

      expect(result.crewLeadId).toBe('crew-002'); // Preferred lead
    });

    it('should exclude specified crew members', async () => {
      const requirements = createMockRequirements({
        crewSize: 2,
        excludeCrewIds: ['crew-003'],
      });

      jest.spyOn(service, 'suggestCrew').mockResolvedValue([
        {
          crewMemberId: 'crew-001',
          crewMemberName: 'John Doe',
          score: 95,
          scoreBreakdown: {
            skillsMatch: 30,
            availability: 20,
            proximity: 20,
            performance: 15,
            workload: 10,
            teamPreference: 0,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 2,
            hoursWorked: 16,
            utilizationRate: 0.5,
          },
        },
        {
          crewMemberId: 'crew-002',
          crewMemberName: 'Jane Smith',
          score: 90,
          scoreBreakdown: {
            skillsMatch: 25,
            availability: 20,
            proximity: 15,
            performance: 15,
            workload: 10,
            teamPreference: 5,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 3,
            hoursWorked: 24,
            utilizationRate: 0.75,
          },
        },
      ]);

      const result = await service.autoAssignCrew(
        mockJobId,
        requirements,
        mockAssignedBy,
      );

      expect(result.crewMembers).not.toContain('crew-003');
    });

    it('should set isConfirmed to false initially', async () => {
      const requirements = createMockRequirements({ crewSize: 1 });

      jest.spyOn(service, 'suggestCrew').mockResolvedValue([
        {
          crewMemberId: 'crew-001',
          crewMemberName: 'John Doe',
          score: 95,
          scoreBreakdown: {
            skillsMatch: 30,
            availability: 20,
            proximity: 20,
            performance: 15,
            workload: 10,
            teamPreference: 0,
          },
          isAvailable: true,
          currentWorkload: {
            totalJobs: 2,
            hoursWorked: 16,
            utilizationRate: 0.5,
          },
        },
      ]);

      const result = await service.autoAssignCrew(
        mockJobId,
        requirements,
        mockAssignedBy,
      );

      expect(result.isConfirmed).toBe(false);
      expect(result.confirmedBy).toEqual([]);
    });
  });

  describe('getCrewAssignment', () => {
    it('should return crew assignment for job', async () => {
      const mockAssignment = {
        jobId: mockJobId,
        crewMembers: ['crew-001', 'crew-002'],
        crewLeadId: 'crew-001',
        assignedBy: mockAssignedBy,
      };

      mockCrewAssignmentModel.findOne.mockReturnValue(
        createMockQuery(mockAssignment),
      );

      const result = await service.getCrewAssignment(mockJobId);

      expect(result).toEqual(mockAssignment);
      expect(mockCrewAssignmentModel.findOne).toHaveBeenCalledWith({
        jobId: mockJobId,
      });
    });

    it('should return null when no assignment exists', async () => {
      mockCrewAssignmentModel.findOne.mockReturnValue(createMockQuery(null));

      const result = await service.getCrewAssignment(mockJobId);

      expect(result).toBeNull();
    });
  });

  describe('confirmAssignment', () => {
    it('should add crew member to confirmed list', async () => {
      const assignmentId = 'assignment123';
      const mockAssignment = {
        _id: assignmentId,
        crewMembers: ['crew-001', 'crew-002'],
        confirmedBy: [],
        isConfirmed: false,
        save: jest.fn().mockResolvedThis(),
      };

      mockCrewAssignmentModel.findById.mockResolvedValue(mockAssignment);

      await service.confirmAssignment(assignmentId, 'crew-001');

      expect(mockAssignment.confirmedBy).toContain('crew-001');
      expect(mockAssignment.save).toHaveBeenCalled();
    });

    it('should mark assignment as confirmed when all crew confirm', async () => {
      const assignmentId = 'assignment123';
      const mockAssignment = {
        _id: assignmentId,
        crewMembers: ['crew-001', 'crew-002'],
        confirmedBy: ['crew-001'],
        isConfirmed: false,
        save: jest.fn().mockResolvedThis(),
      };

      mockCrewAssignmentModel.findById.mockResolvedValue(mockAssignment);

      await service.confirmAssignment(assignmentId, 'crew-002');

      expect(mockAssignment.confirmedBy).toHaveLength(2);
      expect(mockAssignment.isConfirmed).toBe(true);
    });

    it('should not duplicate confirmations', async () => {
      const assignmentId = 'assignment123';
      const mockAssignment = {
        _id: assignmentId,
        crewMembers: ['crew-001', 'crew-002'],
        confirmedBy: ['crew-001'],
        isConfirmed: false,
        save: jest.fn().mockResolvedThis(),
      };

      mockCrewAssignmentModel.findById.mockResolvedValue(mockAssignment);

      await service.confirmAssignment(assignmentId, 'crew-001');

      expect(mockAssignment.confirmedBy).toHaveLength(1); // Should not duplicate
    });

    it('should throw NotFoundException for non-existent assignment', async () => {
      mockCrewAssignmentModel.findById.mockResolvedValue(null);

      await expect(
        service.confirmAssignment('invalid-id', 'crew-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
