import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { AnalyticsService, AnalyticsEventInput, DashboardMetrics, PeriodFilter } from './analytics.service';
import { AnalyticsEvent } from './schemas/analytics-event.schema';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockAnalyticsEventModel: any;

  const mockAnalyticsEvent = {
    _id: 'event123',
    eventType: 'job_created',
    category: 'jobs',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    data: { jobType: 'local', crewSize: 3 },
    userId: 'user123',
    customerId: 'customer123',
    jobId: 'job123',
    revenue: 800,
    cost: 500,
    profit: 300,
    location: {
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      coordinates: { latitude: 39.7817, longitude: -89.6501 }
    },
    duration: 480, // 8 hours in minutes
    efficiency: 87.5,
    metadata: { source: 'web_app' },
    processed: false,
    save: jest.fn()
  };

  const mockEventModel = jest.fn().mockImplementation(() => ({
    ...mockAnalyticsEvent,
    save: jest.fn().mockResolvedValue(mockAnalyticsEvent)
  }));

  mockEventModel.find = jest.fn();
  mockEventModel.aggregate = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getModelToken(AnalyticsEvent.name),
          useValue: mockEventModel
        }
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    mockAnalyticsEventModel = module.get(getModelToken(AnalyticsEvent.name));

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have logger instance', () => {
      expect((service as any).logger).toBeInstanceOf(Logger);
    });
  });

  describe('trackEvent', () => {
    const eventInput: AnalyticsEventInput = {
      eventType: 'job_completed',
      category: 'jobs',
      data: { jobType: 'local', duration: 6 },
      userId: 'user123',
      customerId: 'customer123',
      jobId: 'job456',
      revenue: 1200,
      cost: 700,
      profit: 500,
      location: {
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601'
      },
      duration: 360,
      efficiency: 92.3
    };

    it('should track event successfully', async () => {
      const mockSavedEvent = { ...mockAnalyticsEvent, ...eventInput };
      const mockInstance = {
        save: jest.fn().mockResolvedValue(mockSavedEvent)
      };
      mockEventModel.mockReturnValue(mockInstance);

      const result = await service.trackEvent(eventInput);

      expect(mockEventModel).toHaveBeenCalledWith({
        ...eventInput,
        timestamp: expect.any(Date),
        processed: false
      });
      expect(result).toEqual(mockSavedEvent);
    });

    it('should handle tracking errors and throw', async () => {
      const error = new Error('Database connection failed');
      const mockInstance = {
        save: jest.fn().mockRejectedValue(error)
      };
      mockEventModel.mockReturnValue(mockInstance);

      await expect(service.trackEvent(eventInput)).rejects.toThrow(error);
    });

    it('should log successful event tracking', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      const mockInstance = {
        save: jest.fn().mockResolvedValue(mockAnalyticsEvent)
      };
      mockEventModel.mockReturnValue(mockInstance);

      await service.trackEvent(eventInput);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Tracked event: job_completed for user user123'
      );
    });

    it('should log errors during event tracking', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      const mockInstance = {
        save: jest.fn().mockRejectedValue(error)
      };
      mockEventModel.mockReturnValue(mockInstance);

      await expect(service.trackEvent(eventInput)).rejects.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to track event: Database error',
        error.stack
      );
    });
  });

  describe('getDashboardMetrics', () => {
    const mockPeriod: PeriodFilter = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    beforeEach(() => {
      // Mock all the aggregation methods
      jest.spyOn(service as any, 'getJobMetrics').mockResolvedValue({
        total: 25,
        active: 3,
        completed: 20
      });

      jest.spyOn(service as any, 'getRevenueMetrics').mockResolvedValue({
        totalRevenue: 50000,
        averageRevenue: 2000,
        count: 25
      });

      jest.spyOn(service as any, 'getTodayMetrics').mockResolvedValue({
        completedJobs: 2,
        revenue: 3500
      });

      jest.spyOn(service as any, 'getTopServices').mockResolvedValue([
        { service: 'local', count: 15, revenue: 30000 },
        { service: 'long_distance', count: 8, revenue: 18000 }
      ]);

      jest.spyOn(service as any, 'getMonthlyRevenue').mockResolvedValue([
        { month: '2024-01', revenue: 25000, jobs: 12 },
        { month: '2024-02', revenue: 30000, jobs: 15 }
      ]);

      jest.spyOn(service as any, 'getPerformanceMetrics').mockResolvedValue({
        averageJobDuration: 4.5,
        averageCrewEfficiency: 87.3,
        jobCompletionRate: 94.7,
        crewUtilization: 78.2,
        onTimePerformance: 91.5
      });
    });

    it('should return comprehensive dashboard metrics', async () => {
      const result = await service.getDashboardMetrics(mockPeriod);

      const expectedMetrics: DashboardMetrics = {
        totalJobs: 25,
        activeJobs: 3,
        completedJobsToday: 2,
        totalRevenue: 50000,
        revenueToday: 3500,
        averageJobValue: 2000,
        crewUtilization: 78.2,
        customerSatisfaction: 4.2, // Mock data
        onTimePerformance: 91.5,
        topServices: [
          { service: 'local', count: 15, revenue: 30000 },
          { service: 'long_distance', count: 8, revenue: 18000 }
        ],
        revenueByMonth: [
          { month: '2024-01', revenue: 25000, jobs: 12 },
          { month: '2024-02', revenue: 30000, jobs: 15 }
        ],
        performanceMetrics: {
          averageJobDuration: 4.5,
          averageCrewEfficiency: 87.3,
          jobCompletionRate: 94.7
        }
      };

      expect(result).toEqual(expectedMetrics);
    });

    it('should use default period when none provided', async () => {
      const result = await service.getDashboardMetrics();

      expect(result).toBeDefined();
      expect(result.totalJobs).toBe(25);
      // Should use last 6 months as default period
    });

    it('should handle errors and re-throw them', async () => {
      const error = new Error('Aggregation failed');
      jest.spyOn(service as any, 'getJobMetrics').mockRejectedValue(error);

      await expect(service.getDashboardMetrics(mockPeriod)).rejects.toThrow(error);
    });

    it('should log errors during metrics calculation', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      jest.spyOn(service as any, 'getJobMetrics').mockRejectedValue(error);

      await expect(service.getDashboardMetrics(mockPeriod)).rejects.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to get dashboard metrics: Database error',
        error.stack
      );
    });
  });

  describe('getEventsByType', () => {
    const period: PeriodFilter = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    it('should return events by type within period', async () => {
      const mockEvents = [mockAnalyticsEvent];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvents)
      };

      mockAnalyticsEventModel.find.mockReturnValue(mockQuery);

      const result = await service.getEventsByType('job_completed', period);

      expect(mockAnalyticsEventModel.find).toHaveBeenCalledWith({
        eventType: 'job_completed',
        timestamp: {
          $gte: period.startDate,
          $lte: period.endDate
        }
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockEvents);
    });

    it('should respect custom limit parameter', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };

      mockAnalyticsEventModel.find.mockReturnValue(mockQuery);

      await service.getEventsByType('job_created', period, 50);

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('getEventsByCategory', () => {
    const period: PeriodFilter = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    it('should return events by category within period', async () => {
      const mockEvents = [mockAnalyticsEvent];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvents)
      };

      mockAnalyticsEventModel.find.mockReturnValue(mockQuery);

      const result = await service.getEventsByCategory('jobs', period);

      expect(mockAnalyticsEventModel.find).toHaveBeenCalledWith({
        category: 'jobs',
        timestamp: {
          $gte: period.startDate,
          $lte: period.endDate
        }
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getRevenueAnalytics', () => {
    const period: PeriodFilter = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    it('should return revenue analytics aggregation', async () => {
      const mockAggregationResult = [
        {
          _id: { year: 2024, month: 1, day: 15 },
          totalRevenue: 5000,
          totalCost: 3000,
          totalProfit: 2000,
          jobCount: 3,
          averageJobValue: 1666.67
        }
      ];

      mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.getRevenueAnalytics(period);

      expect(mockAnalyticsEventModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            category: 'revenue',
            timestamp: {
              $gte: period.startDate,
              $lte: period.endDate
            },
            revenue: { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            totalRevenue: { $sum: '$revenue' },
            totalCost: { $sum: '$cost' },
            totalProfit: { $sum: '$profit' },
            jobCount: { $sum: 1 },
            averageJobValue: { $avg: '$revenue' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } as any
        }
      ]);
      expect(result).toEqual(mockAggregationResult);
    });
  });

  describe('getGeographicAnalytics', () => {
    const period: PeriodFilter = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    it('should return geographic analytics aggregation', async () => {
      const mockAggregationResult = [
        {
          _id: { state: 'IL', city: 'Springfield' },
          jobCount: 5,
          totalRevenue: 8000,
          averageRevenue: 1600
        },
        {
          _id: { state: 'IL', city: 'Chicago' },
          jobCount: 3,
          totalRevenue: 6000,
          averageRevenue: 2000
        }
      ];

      mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.getGeographicAnalytics(period);

      expect(mockAnalyticsEventModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            timestamp: {
              $gte: period.startDate,
              $lte: period.endDate
            },
            'location.state': { $exists: true }
          }
        },
        {
          $group: {
            _id: {
              state: '$location.state',
              city: '$location.city'
            },
            jobCount: { $sum: 1 },
            totalRevenue: { $sum: '$revenue' },
            averageRevenue: { $avg: '$revenue' }
          }
        },
        {
          $sort: { jobCount: -1 } as any
        }
      ]);
      expect(result).toEqual(mockAggregationResult);
    });
  });

  describe('private helper methods', () => {
    describe('getJobMetrics', () => {
      it('should calculate job metrics correctly', async () => {
        const mockAggregationResult = [
          { _id: 'job_created', count: 25 },
          { _id: 'job_started', count: 23 },
          { _id: 'job_completed', count: 20 }
        ];

        mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getJobMetrics(period);

        expect(result).toEqual({
          total: 25,
          active: 3, // started - completed
          completed: 20
        });
      });

      it('should handle missing metrics gracefully', async () => {
        mockAnalyticsEventModel.aggregate.mockResolvedValue([]);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getJobMetrics(period);

        expect(result).toEqual({
          total: 0,
          active: 0,
          completed: 0
        });
      });
    });

    describe('getRevenueMetrics', () => {
      it('should calculate revenue metrics correctly', async () => {
        const mockAggregationResult = [
          {
            _id: null,
            totalRevenue: 50000,
            averageRevenue: 2000,
            count: 25
          }
        ];

        mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getRevenueMetrics(period);

        expect(result).toEqual({
          totalRevenue: 50000,
          averageRevenue: 2000,
          count: 25
        });
      });

      it('should return defaults when no revenue data', async () => {
        mockAnalyticsEventModel.aggregate.mockResolvedValue([]);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getRevenueMetrics(period);

        expect(result).toEqual({
          totalRevenue: 0,
          averageRevenue: 0,
          count: 0
        });
      });
    });

    describe('getTodayMetrics', () => {
      it('should calculate today metrics correctly', async () => {
        const mockAggregationResult = [
          { _id: 'job_completed', count: 2, revenue: 3000 },
          { _id: 'job_created', count: 1, revenue: 500 }
        ];

        mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const result = await (service as any).getTodayMetrics(startOfToday);

        expect(result).toEqual({
          completedJobs: 2,
          revenue: 3500
        });
      });
    });

    describe('getTopServices', () => {
      it('should return top services by revenue', async () => {
        const mockAggregationResult = [
          { _id: 'local', count: 15, revenue: 30000 },
          { _id: 'long_distance', count: 8, revenue: 18000 },
          { _id: 'storage', count: 5, revenue: 5000 }
        ];

        mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getTopServices(period);

        expect(result).toEqual([
          { service: 'local', count: 15, revenue: 30000 },
          { service: 'long_distance', count: 8, revenue: 18000 },
          { service: 'storage', count: 5, revenue: 5000 }
        ]);
      });

      it('should handle null revenue values', async () => {
        const mockAggregationResult = [
          { _id: 'local', count: 15, revenue: null },
          { _id: 'storage', count: 5, revenue: 5000 }
        ];

        mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getTopServices(period);

        expect(result).toEqual([
          { service: 'local', count: 15, revenue: 0 },
          { service: 'storage', count: 5, revenue: 5000 }
        ]);
      });
    });

    describe('getMonthlyRevenue', () => {
      it('should return monthly revenue data', async () => {
        const mockAggregationResult = [
          { _id: { year: 2024, month: 1 }, revenue: 25000, jobs: 12 },
          { _id: { year: 2024, month: 2 }, revenue: 30000, jobs: 15 }
        ];

        mockAnalyticsEventModel.aggregate.mockResolvedValue(mockAggregationResult);

        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-02-29')
        };

        const result = await (service as any).getMonthlyRevenue(period);

        expect(result).toEqual([
          { month: '2024-01', revenue: 25000, jobs: 12 },
          { month: '2024-02', revenue: 30000, jobs: 15 }
        ]);
      });
    });

    describe('getPerformanceMetrics', () => {
      it('should return mock performance metrics', async () => {
        const period: PeriodFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = await (service as any).getPerformanceMetrics(period);

        expect(result).toEqual({
          averageJobDuration: 4.5,
          averageCrewEfficiency: 87.3,
          jobCompletionRate: 94.7,
          crewUtilization: 78.2,
          onTimePerformance: 91.5
        });
      });
    });
  });

  describe('aggregation query structure validation', () => {
    it('should use correct aggregation pipeline for revenue analytics', async () => {
      const period: PeriodFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockAnalyticsEventModel.aggregate.mockResolvedValue([]);

      await service.getRevenueAnalytics(period);

      const calledPipeline = mockAnalyticsEventModel.aggregate.mock.calls[0][0];

      // Verify match stage
      expect(calledPipeline[0].$match).toEqual({
        category: 'revenue',
        timestamp: {
          $gte: period.startDate,
          $lte: period.endDate
        },
        revenue: { $exists: true, $gt: 0 }
      });

      // Verify group stage
      expect(calledPipeline[1].$group._id).toEqual({
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      });

      // Verify sort stage
      expect(calledPipeline[2].$sort).toEqual({
        '_id.year': 1,
        '_id.month': 1,
        '_id.day': 1
      });
    });

    it('should use correct aggregation pipeline for geographic analytics', async () => {
      const period: PeriodFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockAnalyticsEventModel.aggregate.mockResolvedValue([]);

      await service.getGeographicAnalytics(period);

      const calledPipeline = mockAnalyticsEventModel.aggregate.mock.calls[0][0];

      // Verify match stage filters by location and date
      expect(calledPipeline[0].$match).toEqual({
        timestamp: {
          $gte: period.startDate,
          $lte: period.endDate
        },
        'location.state': { $exists: true }
      });

      // Verify group stage groups by state and city
      expect(calledPipeline[1].$group._id).toEqual({
        state: '$location.state',
        city: '$location.city'
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle database aggregation errors', async () => {
      const error = new Error('MongoDB aggregation failed');
      mockAnalyticsEventModel.aggregate.mockRejectedValue(error);

      const period: PeriodFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      await expect(service.getRevenueAnalytics(period)).rejects.toThrow(error);
    });

    it('should handle find query errors', async () => {
      const error = new Error('MongoDB find failed');
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(error)
      };

      mockAnalyticsEventModel.find.mockReturnValue(mockQuery);

      const period: PeriodFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      await expect(service.getEventsByType('job_created', period)).rejects.toThrow(error);
    });

    it('should handle events with missing optional fields', async () => {
      const minimalEvent: AnalyticsEventInput = {
        eventType: 'customer_created',
        category: 'customers',
        data: { customerType: 'residential' },
        userId: 'user123'
      };

      mockEventModel.constructor().save.mockResolvedValue({
        ...mockAnalyticsEvent,
        ...minimalEvent
      });

      const result = await service.trackEvent(minimalEvent);

      expect(result).toBeDefined();
      expect(mockEventModel.constructor).toHaveBeenCalledWith({
        ...minimalEvent,
        timestamp: expect.any(Date),
        processed: false
      });
    });
  });
});