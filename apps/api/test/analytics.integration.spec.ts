import { INestApplication } from '@nestjs/common';
import {
  setupTestApp,
  teardownTestApp,
  cleanupDatabase,
  TestDataFactories,
  createAuthenticatedTestUser,
  authenticatedRequest,
  ResponseAssertions,
  TestAuthData,
} from './integration-setup';

/**
 * Analytics and Reporting Integration Tests
 *
 * Comprehensive test suite for analytics and business intelligence:
 * - Dashboard metrics and KPIs
 * - Revenue analysis and tracking
 * - Performance metrics and monitoring
 * - Business intelligence calculations
 * - Custom report generation
 * - Data aggregation accuracy
 * - Real-time analytics updates
 * - Report export functionality
 * - Date range filtering
 * - Multi-dimensional analytics
 *
 * Tests validate complete analytics pipeline including:
 * - Accurate metric calculations from live data
 * - Report generation with proper formatting
 * - Data aggregation performance under load
 * - Role-based access to sensitive metrics
 * - Export functionality across multiple formats
 * - Real-time data synchronization
 */

describe('Analytics and Reporting Integration Tests', () => {
  let app: INestApplication;
  let adminAuth: TestAuthData;
  let dispatcherAuth: TestAuthData;
  let crewAuth: TestAuthData;
  let testCustomers: any[];
  let testJobs: any[];

  beforeAll(async () => {
    app = await setupTestApp();

    // Create test users with different roles
    adminAuth = await createAuthenticatedTestUser({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read:all', 'write:all', 'manage:analytics', 'view:reports'],
    });

    dispatcherAuth = await createAuthenticatedTestUser({
      email: 'dispatcher@example.com',
      role: 'dispatcher',
      permissions: ['read:analytics', 'view:reports'],
    });

    crewAuth = await createAuthenticatedTestUser({
      email: 'crew@example.com',
      role: 'crew',
      permissions: ['read:jobs'],
    });
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();

    // Create comprehensive test data for analytics
    await createTestDataSet();
  });

  /**
   * Create a comprehensive test dataset for analytics testing
   */
  async function createTestDataSet(): Promise<void> {
    testCustomers = [];
    testJobs = [];

    // Create diverse customers
    const customerTypes = [
      { type: 'residential', status: 'active', count: 5 },
      { type: 'commercial', status: 'active', count: 3 },
      { type: 'residential', status: 'lead', count: 4 },
      { type: 'commercial', status: 'prospect', count: 2 },
      { type: 'residential', status: 'inactive', count: 2 },
    ];

    for (const customerType of customerTypes) {
      for (let i = 0; i < customerType.count; i++) {
        const customerData = TestDataFactories.createCustomerData({
          email: `${customerType.type}-${customerType.status}-${i}@example.com`,
          type: customerType.type,
          status: customerType.status,
        });

        const response = await authenticatedRequest(app, 'post', '/customers', adminAuth.accessToken)
          .send(customerData);
        testCustomers.push(response.body.data);
      }
    }

    // Create diverse jobs with varying statuses, types, and revenues
    const jobConfigs = [
      { type: 'local', status: 'completed', cost: 1500, count: 8 },
      { type: 'local', status: 'in_progress', cost: 1200, count: 3 },
      { type: 'local', status: 'scheduled', cost: 1000, count: 5 },
      { type: 'long_distance', status: 'completed', cost: 5000, count: 4 },
      { type: 'long_distance', status: 'in_progress', cost: 4500, count: 2 },
      { type: 'storage', status: 'completed', cost: 800, count: 3 },
      { type: 'packing_only', status: 'completed', cost: 600, count: 2 },
      { type: 'local', status: 'cancelled', cost: 0, count: 2 },
    ];

    let customerIndex = 0;
    for (const jobConfig of jobConfigs) {
      for (let i = 0; i < jobConfig.count; i++) {
        const customer = testCustomers[customerIndex % testCustomers.length];
        customerIndex++;

        const jobData = TestDataFactories.createJobData(customer.id, {
          type: jobConfig.type,
          status: jobConfig.status,
          estimatedCost: jobConfig.cost,
          actualCost: jobConfig.status === 'completed' ? jobConfig.cost + (Math.random() * 200 - 100) : null,
          completedAt: jobConfig.status === 'completed' ? new Date() : null,
          scheduledDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)), // Spread over days
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
          .send(jobData);
        testJobs.push(response.body.data);
      }
    }

    console.log(`✅ Created test dataset: ${testCustomers.length} customers, ${testJobs.length} jobs`);
  }

  describe('Dashboard Analytics', () => {
    describe('GET /analytics/dashboard/overview', () => {
      it('should return comprehensive dashboard metrics', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/dashboard/overview',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const metrics = response.body.data;
        expect(metrics).toHaveProperty('totalCustomers');
        expect(metrics).toHaveProperty('activeJobs');
        expect(metrics).toHaveProperty('completedJobs');
        expect(metrics).toHaveProperty('totalRevenue');
        expect(metrics).toHaveProperty('averageJobValue');
        expect(metrics).toHaveProperty('conversionRate');
        expect(metrics).toHaveProperty('revenueGrowth');
        expect(metrics).toHaveProperty('customerGrowth');

        // Validate metric values based on test data
        expect(metrics.totalCustomers).toBe(testCustomers.length);
        expect(metrics.activeJobs).toBeGreaterThan(0);
        expect(metrics.completedJobs).toBeGreaterThan(0);
        expect(metrics.totalRevenue).toBeGreaterThan(0);
        expect(metrics.averageJobValue).toBeGreaterThan(0);
      });

      it('should allow dispatchers to view dashboard metrics', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/dashboard/overview',
          dispatcherAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('totalCustomers');
        expect(response.body.data).toHaveProperty('activeJobs');
      });

      it('should deny access to crew members', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/dashboard/overview',
          crewAuth.accessToken
        ).expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });

      it('should filter metrics by date range', async () => {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        const response = await authenticatedRequest(
          app,
          'get',
          `/analytics/dashboard/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('dateRange');
        expect(response.body.data.dateRange).toMatchObject({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
      });
    });

    describe('GET /analytics/dashboard/revenue-breakdown', () => {
      it('should return revenue breakdown by service type', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/dashboard/revenue-breakdown',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const breakdown = response.body.data;
        expect(Array.isArray(breakdown)).toBe(true);

        breakdown.forEach((item: any) => {
          expect(item).toHaveProperty('serviceType');
          expect(item).toHaveProperty('revenue');
          expect(item).toHaveProperty('jobCount');
          expect(item).toHaveProperty('averageValue');
          expect(item).toHaveProperty('percentage');
          expect(typeof item.revenue).toBe('number');
          expect(typeof item.jobCount).toBe('number');
          expect(typeof item.percentage).toBe('number');
        });

        // Verify percentages add up to 100
        const totalPercentage = breakdown.reduce((sum: number, item: any) => sum + item.percentage, 0);
        expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.1); // Allow for rounding
      });

      it('should include all service types with data', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/dashboard/revenue-breakdown',
          adminAuth.accessToken
        ).expect(200);

        const breakdown = response.body.data;
        const serviceTypes = breakdown.map((item: any) => item.serviceType);

        expect(serviceTypes).toContain('local');
        expect(serviceTypes).toContain('long_distance');
        expect(serviceTypes).toContain('storage');
      });
    });

    describe('GET /analytics/dashboard/job-status-distribution', () => {
      it('should return job status distribution', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/dashboard/job-status-distribution',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const distribution = response.body.data;
        expect(Array.isArray(distribution)).toBe(true);

        distribution.forEach((item: any) => {
          expect(item).toHaveProperty('status');
          expect(item).toHaveProperty('count');
          expect(item).toHaveProperty('percentage');
          expect(typeof item.count).toBe('number');
          expect(typeof item.percentage).toBe('number');
        });

        // Verify total count matches test data
        const totalJobs = distribution.reduce((sum: number, item: any) => sum + item.count, 0);
        expect(totalJobs).toBe(testJobs.length);
      });
    });
  });

  describe('Revenue Analytics', () => {
    describe('GET /analytics/revenue/trends', () => {
      it('should return revenue trends over time', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/revenue/trends?period=daily&days=30',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const trends = response.body.data;
        expect(Array.isArray(trends)).toBe(true);

        trends.forEach((trend: any) => {
          expect(trend).toHaveProperty('date');
          expect(trend).toHaveProperty('revenue');
          expect(trend).toHaveProperty('jobCount');
          expect(typeof trend.revenue).toBe('number');
          expect(typeof trend.jobCount).toBe('number');
          expect(new Date(trend.date)).toBeInstanceOf(Date);
        });
      });

      it('should support different time periods', async () => {
        const periods = ['daily', 'weekly', 'monthly'];

        for (const period of periods) {
          const response = await authenticatedRequest(
            app,
            'get',
            `/analytics/revenue/trends?period=${period}`,
            adminAuth.accessToken
          ).expect(200);

          ResponseAssertions.assertSuccessResponse(response);
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should handle custom date ranges', async () => {
        const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
        const endDate = new Date();

        const response = await authenticatedRequest(
          app,
          'get',
          `/analytics/revenue/trends?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /analytics/revenue/by-service-type', () => {
      it('should return revenue analysis by service type', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/revenue/by-service-type',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const analysis = response.body.data;
        expect(Array.isArray(analysis)).toBe(true);

        analysis.forEach((service: any) => {
          expect(service).toHaveProperty('serviceType');
          expect(service).toHaveProperty('totalRevenue');
          expect(service).toHaveProperty('jobCount');
          expect(service).toHaveProperty('averageJobValue');
          expect(service).toHaveProperty('revenueGrowth');
          expect(service).toHaveProperty('marketShare');
          expect(typeof service.totalRevenue).toBe('number');
          expect(typeof service.jobCount).toBe('number');
          expect(typeof service.averageJobValue).toBe('number');
        });
      });
    });
  });

  describe('Performance Analytics', () => {
    describe('GET /analytics/performance/crew-productivity', () => {
      it('should return crew productivity metrics', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/performance/crew-productivity',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const metrics = response.body.data;
        expect(metrics).toHaveProperty('averageJobDuration');
        expect(metrics).toHaveProperty('completionRate');
        expect(metrics).toHaveProperty('utilizationRate');
        expect(metrics).toHaveProperty('efficiencyScore');
        expect(typeof metrics.averageJobDuration).toBe('number');
        expect(typeof metrics.completionRate).toBe('number');
        expect(typeof metrics.utilizationRate).toBe('number');
        expect(typeof metrics.efficiencyScore).toBe('number');
      });
    });

    describe('GET /analytics/performance/job-completion-rate', () => {
      it('should return job completion rate analysis', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/performance/job-completion-rate',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const analysis = response.body.data;
        expect(analysis).toHaveProperty('overallCompletionRate');
        expect(analysis).toHaveProperty('completionRateByType');
        expect(analysis).toHaveProperty('onTimeCompletionRate');
        expect(analysis).toHaveProperty('averageCompletionTime');
        expect(typeof analysis.overallCompletionRate).toBe('number');
        expect(Array.isArray(analysis.completionRateByType)).toBe(true);
        expect(typeof analysis.onTimeCompletionRate).toBe('number');
      });
    });
  });

  describe('Customer Analytics', () => {
    describe('GET /analytics/customers/acquisition', () => {
      it('should return customer acquisition metrics', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/customers/acquisition',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const metrics = response.body.data;
        expect(metrics).toHaveProperty('newCustomers');
        expect(metrics).toHaveProperty('acquisitionRate');
        expect(metrics).toHaveProperty('conversionRate');
        expect(metrics).toHaveProperty('customerLifetimeValue');
        expect(metrics).toHaveProperty('acquisitionCost');
        expect(typeof metrics.newCustomers).toBe('number');
        expect(typeof metrics.acquisitionRate).toBe('number');
        expect(typeof metrics.conversionRate).toBe('number');
      });
    });

    describe('GET /analytics/customers/retention', () => {
      it('should return customer retention analysis', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/customers/retention',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const analysis = response.body.data;
        expect(analysis).toHaveProperty('retentionRate');
        expect(analysis).toHaveProperty('churnRate');
        expect(analysis).toHaveProperty('repeatCustomerRate');
        expect(analysis).toHaveProperty('averageCustomerValue');
        expect(typeof analysis.retentionRate).toBe('number');
        expect(typeof analysis.churnRate).toBe('number');
        expect(typeof analysis.repeatCustomerRate).toBe('number');
      });
    });

    describe('GET /analytics/customers/segmentation', () => {
      it('should return customer segmentation analysis', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/customers/segmentation',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const segmentation = response.body.data;
        expect(segmentation).toHaveProperty('byType');
        expect(segmentation).toHaveProperty('byStatus');
        expect(segmentation).toHaveProperty('byValue');
        expect(Array.isArray(segmentation.byType)).toBe(true);
        expect(Array.isArray(segmentation.byStatus)).toBe(true);
        expect(Array.isArray(segmentation.byValue)).toBe(true);

        // Verify customer type breakdown
        const typeBreakdown = segmentation.byType;
        typeBreakdown.forEach((segment: any) => {
          expect(segment).toHaveProperty('type');
          expect(segment).toHaveProperty('count');
          expect(segment).toHaveProperty('percentage');
          expect(['residential', 'commercial']).toContain(segment.type);
        });
      });
    });
  });

  describe('Custom Reports', () => {
    describe('POST /analytics/reports/generate', () => {
      it('should generate custom revenue report', async () => {
        const reportConfig = {
          reportType: 'revenue',
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
          },
          groupBy: 'serviceType',
          metrics: ['totalRevenue', 'jobCount', 'averageValue'],
          format: 'json',
        };

        const response = await authenticatedRequest(
          app,
          'post',
          '/analytics/reports/generate',
          adminAuth.accessToken
        )
          .send(reportConfig)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const report = response.body.data;
        expect(report).toHaveProperty('reportId');
        expect(report).toHaveProperty('reportType', 'revenue');
        expect(report).toHaveProperty('status', 'completed');
        expect(report).toHaveProperty('data');
        expect(Array.isArray(report.data)).toBe(true);

        report.data.forEach((item: any) => {
          expect(item).toHaveProperty('serviceType');
          expect(item).toHaveProperty('totalRevenue');
          expect(item).toHaveProperty('jobCount');
          expect(item).toHaveProperty('averageValue');
        });
      });

      it('should generate custom performance report', async () => {
        const reportConfig = {
          reportType: 'performance',
          dateRange: {
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
          },
          groupBy: 'month',
          metrics: ['completionRate', 'averageDuration', 'efficiency'],
          format: 'json',
        };

        const response = await authenticatedRequest(
          app,
          'post',
          '/analytics/reports/generate',
          adminAuth.accessToken
        )
          .send(reportConfig)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const report = response.body.data;
        expect(report).toHaveProperty('reportType', 'performance');
        expect(report).toHaveProperty('status', 'completed');
        expect(Array.isArray(report.data)).toBe(true);
      });

      it('should validate report configuration', async () => {
        const invalidConfig = {
          reportType: 'invalid-type',
          dateRange: {
            startDate: 'invalid-date',
            endDate: new Date(),
          },
        };

        const response = await authenticatedRequest(
          app,
          'post',
          '/analytics/reports/generate',
          adminAuth.accessToken
        )
          .send(invalidConfig)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });

      it('should require report generation permissions', async () => {
        const reportConfig = {
          reportType: 'revenue',
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
          },
        };

        const response = await authenticatedRequest(
          app,
          'post',
          '/analytics/reports/generate',
          crewAuth.accessToken
        )
          .send(reportConfig)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });
    });

    describe('GET /analytics/reports/:reportId', () => {
      it('should retrieve generated report', async () => {
        // First generate a report
        const reportConfig = {
          reportType: 'revenue',
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
          },
          format: 'json',
        };

        const generateResponse = await authenticatedRequest(
          app,
          'post',
          '/analytics/reports/generate',
          adminAuth.accessToken
        )
          .send(reportConfig);

        const reportId = generateResponse.body.data.reportId;

        // Retrieve the report
        const response = await authenticatedRequest(
          app,
          'get',
          `/analytics/reports/${reportId}`,
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('reportId', reportId);
        expect(response.body.data).toHaveProperty('reportType', 'revenue');
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('data');
      });

      it('should return 404 for non-existent report', async () => {
        const nonExistentId = '507f1f77bcf86cd799439011';

        const response = await authenticatedRequest(
          app,
          'get',
          `/analytics/reports/${nonExistentId}`,
          adminAuth.accessToken
        ).expect(404);

        ResponseAssertions.assertErrorResponse(response, 404);
      });
    });

    describe('GET /analytics/reports', () => {
      it('should list user reports', async () => {
        // Generate a couple of reports
        const reportConfigs = [
          { reportType: 'revenue', format: 'json' },
          { reportType: 'performance', format: 'json' },
        ];

        for (const config of reportConfigs) {
          await authenticatedRequest(
            app,
            'post',
            '/analytics/reports/generate',
            adminAuth.accessToken
          ).send({
            ...config,
            dateRange: {
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endDate: new Date(),
            },
          });
        }

        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/reports',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBeGreaterThanOrEqual(2);

        response.body.data.items.forEach((report: any) => {
          expect(report).toHaveProperty('reportId');
          expect(report).toHaveProperty('reportType');
          expect(report).toHaveProperty('status');
          expect(report).toHaveProperty('createdAt');
        });
      });
    });
  });

  describe('Export Functionality', () => {
    describe('GET /analytics/export/revenue', () => {
      it('should export revenue data in CSV format', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/export/revenue?format=csv',
          adminAuth.accessToken
        ).expect(200);

        expect(response.headers['content-type']).toMatch(/text\/csv/);
        expect(response.headers['content-disposition']).toMatch(/attachment.*csv/);
        expect(typeof response.text).toBe('string');
        expect(response.text).toContain('Service Type'); // CSV header
      });

      it('should export revenue data in Excel format', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/export/revenue?format=excel',
          adminAuth.accessToken
        ).expect(200);

        expect(response.headers['content-type']).toMatch(/spreadsheet/);
        expect(response.headers['content-disposition']).toMatch(/attachment.*xlsx/);
      });

      it('should validate export format', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/export/revenue?format=invalid',
          adminAuth.accessToken
        ).expect(400);

        ResponseAssertions.assertErrorResponse(response, 400, /format/i);
      });

      it('should require export permissions', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/export/revenue?format=csv',
          crewAuth.accessToken
        ).expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });
    });
  });

  describe('Real-time Analytics', () => {
    describe('GET /analytics/realtime/metrics', () => {
      it('should return real-time metrics', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/analytics/realtime/metrics',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const metrics = response.body.data;
        expect(metrics).toHaveProperty('activeJobs');
        expect(metrics).toHaveProperty('crewsOnDuty');
        expect(metrics).toHaveProperty('dailyRevenue');
        expect(metrics).toHaveProperty('pendingEstimates');
        expect(metrics).toHaveProperty('lastUpdated');
        expect(new Date(metrics.lastUpdated)).toBeInstanceOf(Date);
      });

      it('should update metrics when jobs change status', async () => {
        // Get initial metrics
        const initialResponse = await authenticatedRequest(
          app,
          'get',
          '/analytics/realtime/metrics',
          adminAuth.accessToken
        );

        const initialActiveJobs = initialResponse.body.data.activeJobs;

        // Create a new job
        const customerData = TestDataFactories.createCustomerData({
          email: 'realtime-test@example.com',
        });
        const customerResponse = await authenticatedRequest(app, 'post', '/customers', adminAuth.accessToken)
          .send(customerData);

        const jobData = TestDataFactories.createJobData(customerResponse.body.data.id, {
          status: 'in_progress',
        });
        await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
          .send(jobData);

        // Get updated metrics
        const updatedResponse = await authenticatedRequest(
          app,
          'get',
          '/analytics/realtime/metrics',
          adminAuth.accessToken
        );

        const updatedActiveJobs = updatedResponse.body.data.activeJobs;
        expect(updatedActiveJobs).toBe(initialActiveJobs + 1);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent analytics requests', async () => {
      const endpoints = [
        '/analytics/dashboard/overview',
        '/analytics/revenue/trends?period=daily',
        '/analytics/performance/crew-productivity',
        '/analytics/customers/acquisition',
        '/analytics/dashboard/revenue-breakdown',
      ];

      const requests = endpoints.map(endpoint =>
        authenticatedRequest(app, 'get', endpoint, adminAuth.accessToken)
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        ResponseAssertions.assertSuccessResponse(response);
      });
    }, 15000);

    it('should calculate complex aggregations efficiently', async () => {
      const startTime = Date.now();

      const response = await authenticatedRequest(
        app,
        'get',
        '/analytics/revenue/trends?period=daily&days=365',
        adminAuth.accessToken
      ).expect(200);

      const endTime = Date.now();

      ResponseAssertions.assertSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should complete in reasonable time (less than 3 seconds)
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should handle large dataset analytics efficiently', async () => {
      // Create additional test data for large dataset testing
      const additionalJobs = [];
      const customer = testCustomers[0];

      for (let i = 0; i < 100; i++) {
        const jobData = TestDataFactories.createJobData(customer.id, {
          status: 'completed',
          actualCost: Math.random() * 2000 + 500,
          completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        });

        additionalJobs.push(
          authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken).send(jobData)
        );
      }

      await Promise.all(additionalJobs);

      const startTime = Date.now();

      const response = await authenticatedRequest(
        app,
        'get',
        '/analytics/dashboard/overview',
        adminAuth.accessToken
      ).expect(200);

      const endTime = Date.now();

      ResponseAssertions.assertSuccessResponse(response);
      expect(response.body.data.completedJobs).toBeGreaterThan(100);

      // Should handle large dataset efficiently (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    }, 30000);
  });

  describe('Data Accuracy and Integrity', () => {
    it('should calculate revenue metrics accurately', async () => {
      // Get completed jobs from test data
      const completedJobs = testJobs.filter(job => job.status === 'completed');
      const expectedRevenue = completedJobs.reduce((sum, job) => sum + (job.actualCost || job.estimatedCost), 0);

      const response = await authenticatedRequest(
        app,
        'get',
        '/analytics/dashboard/overview',
        adminAuth.accessToken
      ).expect(200);

      const actualRevenue = response.body.data.totalRevenue;

      // Allow for minor rounding differences
      expect(Math.abs(actualRevenue - expectedRevenue)).toBeLessThan(0.01);
    });

    it('should calculate customer conversion rates accurately', async () => {
      const activeCustomers = testCustomers.filter(c => c.status === 'active').length;
      const totalCustomers = testCustomers.length;
      const expectedConversionRate = (activeCustomers / totalCustomers) * 100;

      const response = await authenticatedRequest(
        app,
        'get',
        '/analytics/customers/acquisition',
        adminAuth.accessToken
      ).expect(200);

      const actualConversionRate = response.body.data.conversionRate;

      // Allow for minor rounding differences
      expect(Math.abs(actualConversionRate - expectedConversionRate)).toBeLessThan(1);
    });

    it('should maintain consistency across related metrics', async () => {
      const overviewResponse = await authenticatedRequest(
        app,
        'get',
        '/analytics/dashboard/overview',
        adminAuth.accessToken
      );

      const revenueResponse = await authenticatedRequest(
        app,
        'get',
        '/analytics/revenue/by-service-type',
        adminAuth.accessToken
      );

      const overviewRevenue = overviewResponse.body.data.totalRevenue;
      const revenueBreakdownTotal = revenueResponse.body.data.reduce(
        (sum: number, item: any) => sum + item.totalRevenue,
        0
      );

      // Revenue should be consistent across different endpoints
      expect(Math.abs(overviewRevenue - revenueBreakdownTotal)).toBeLessThan(0.01);
    });
  });
});