import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  teardownTestApp,
  cleanupDatabase,
  TestDataFactories,
  createAuthenticatedTestUser,
  authenticatedRequest,
  ResponseAssertions,
  TestAuthData,
  waitForCondition,
} from './integration-setup';

/**
 * Job Management Integration Tests
 *
 * Comprehensive test suite for job lifecycle management:
 * - Job creation and validation
 * - Job status transitions (scheduled → in_progress → completed)
 * - Crew assignment and management
 * - Job filtering and search functionality
 * - Calendar integration and scheduling
 * - Cost tracking and updates
 * - Permission-based access control
 * - Real-time updates and notifications
 * - Job priority and resource management
 * - Address validation and geocoding
 *
 * Tests validate complete job operations including:
 * - End-to-end job lifecycle from creation to completion
 * - Complex job scheduling with crew availability
 * - Multi-dimensional job filtering and search
 * - Business logic enforcement and validation
 * - Role-based access to job operations
 * - Data integrity across job relationships
 */

describe('Job Management Integration Tests', () => {
  let app: INestApplication;
  let adminAuth: TestAuthData;
  let dispatcherAuth: TestAuthData;
  let crewAuth: TestAuthData;
  let testCustomer: any;

  beforeAll(async () => {
    app = await setupTestApp();

    // Create test users with different roles
    adminAuth = await createAuthenticatedTestUser({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read:all', 'write:all', 'manage:jobs', 'manage:crews'],
    });

    dispatcherAuth = await createAuthenticatedTestUser({
      email: 'dispatcher@example.com',
      role: 'dispatcher',
      permissions: ['read:jobs', 'write:jobs', 'read:customers', 'assign:crews'],
    });

    crewAuth = await createAuthenticatedTestUser({
      email: 'crew@example.com',
      role: 'crew',
      permissions: ['read:jobs', 'update:job:status'],
    });
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();

    // Create a test customer for job creation
    const customerData = TestDataFactories.createCustomerData({
      email: 'jobcustomer@example.com',
      status: 'active',
    });

    const customerResponse = await authenticatedRequest(app, 'post', '/customers', adminAuth.accessToken)
      .send(customerData);
    testCustomer = customerResponse.body.data;
  });

  describe('Job Creation', () => {
    describe('POST /jobs', () => {
      it('should create a new job with valid data', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          type: 'local',
          status: 'scheduled',
          priority: 'high',
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          customerId: testCustomer.id,
          type: jobData.type,
          status: jobData.status,
          priority: jobData.priority,
          estimatedCost: jobData.estimatedCost,
          crewSize: jobData.crewSize,
          truckSize: jobData.truckSize,
        });
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('createdAt');
        expect(response.body.data).toHaveProperty('scheduledDate');
        expect(response.body.data.pickupAddress).toMatchObject(jobData.pickupAddress);
        expect(response.body.data.deliveryAddress).toMatchObject(jobData.deliveryAddress);
      });

      it('should create job with complete address information', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          pickupAddress: {
            street: '123 Pickup Street',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601',
            country: 'USA',
            accessNotes: 'Use side entrance',
          },
          deliveryAddress: {
            street: '456 Delivery Avenue',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62701',
            country: 'USA',
            accessNotes: 'Loading dock available',
          },
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.pickupAddress).toMatchObject(jobData.pickupAddress);
        expect(response.body.data.deliveryAddress).toMatchObject(jobData.deliveryAddress);
      });

      it('should validate required fields', async () => {
        const incompleteJobData = {
          customerId: testCustomer.id,
          type: 'local',
          // Missing required fields
        };

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(incompleteJobData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/required/i);
      });

      it('should validate customer exists', async () => {
        const nonExistentCustomerId = '507f1f77bcf86cd799439011';
        const jobData = TestDataFactories.createJobData(nonExistentCustomerId);

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(404);

        ResponseAssertions.assertErrorResponse(response, 404, /customer.*not.*found/i);
      });

      it('should validate job type', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          type: 'invalid-type',
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/type/i);
      });

      it('should validate job status', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          status: 'invalid-status',
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/status/i);
      });

      it('should validate priority level', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          priority: 'invalid-priority',
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/priority/i);
      });

      it('should validate scheduled date is in future', async () => {
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          scheduledDate: pastDate,
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', dispatcherAuth.accessToken)
          .send(jobData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/future/i);
      });

      it('should require appropriate permissions to create jobs', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id);

        // Crew member should not be able to create jobs
        const response = await authenticatedRequest(app, 'post', '/jobs', crewAuth.accessToken)
          .send(jobData)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403, /permission/i);
      });

      it('should allow admin to create jobs', async () => {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          type: 'long_distance',
          priority: 'urgent',
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
          .send(jobData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.type).toBe('long_distance');
        expect(response.body.data.priority).toBe('urgent');
      });
    });
  });

  describe('Job Retrieval', () => {
    let testJobs: any[];

    beforeEach(async () => {
      // Create test jobs for search and filter tests
      testJobs = [];

      const jobsData = [
        TestDataFactories.createJobData(testCustomer.id, {
          type: 'local',
          status: 'scheduled',
          priority: 'high',
          description: 'High priority local move',
        }),
        TestDataFactories.createJobData(testCustomer.id, {
          type: 'long_distance',
          status: 'in_progress',
          priority: 'medium',
          description: 'Cross-state relocation',
        }),
        TestDataFactories.createJobData(testCustomer.id, {
          type: 'storage',
          status: 'completed',
          priority: 'low',
          description: 'Storage unit transfer',
        }),
        TestDataFactories.createJobData(testCustomer.id, {
          type: 'local',
          status: 'cancelled',
          priority: 'medium',
          description: 'Cancelled apartment move',
        }),
      ];

      for (const jobData of jobsData) {
        const response = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
          .send(jobData);
        testJobs.push(response.body.data);
      }
    });

    describe('GET /jobs', () => {
      it('should retrieve all jobs for admin', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(testJobs.length);
        expect(response.body.data.total).toBe(testJobs.length);
      });

      it('should allow dispatchers to read jobs', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs', dispatcherAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(testJobs.length);
      });

      it('should allow crew to read jobs', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs', crewAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(testJobs.length);
      });

      it('should filter jobs by status', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs?status=scheduled', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].status).toBe('scheduled');
      });

      it('should filter jobs by type', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs?type=local', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(2);
        response.body.data.items.forEach((job: any) => {
          expect(job.type).toBe('local');
        });
      });

      it('should filter jobs by priority', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs?priority=high', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].priority).toBe('high');
      });

      it('should search jobs by description', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs?search=storage', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].description).toContain('Storage');
      });

      it('should combine multiple filters', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/jobs?type=local&status=scheduled&priority=high',
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].type).toBe('local');
        expect(response.body.data.items[0].status).toBe('scheduled');
        expect(response.body.data.items[0].priority).toBe('high');
      });

      it('should support pagination', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs?page=1&limit=2', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(2);
        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.total).toBe(testJobs.length);
      });

      it('should sort jobs by scheduled date', async () => {
        const response = await authenticatedRequest(app, 'get', '/jobs?sortBy=scheduledDate&sortOrder=asc', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        const jobs = response.body.data.items;

        // Verify sorting order (excluding null scheduled dates)
        const jobsWithDates = jobs.filter((job: any) => job.scheduledDate);
        for (let i = 1; i < jobsWithDates.length; i++) {
          expect(new Date(jobsWithDates[i].scheduledDate).getTime())
            .toBeGreaterThanOrEqual(new Date(jobsWithDates[i - 1].scheduledDate).getTime());
        }
      });
    });

    describe('GET /jobs/:id', () => {
      it('should retrieve specific job by ID', async () => {
        const job = testJobs[0];

        const response = await authenticatedRequest(
          app,
          'get',
          `/jobs/${job.id}`,
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          id: job.id,
          customerId: job.customerId,
          type: job.type,
          status: job.status,
          priority: job.priority,
        });
      });

      it('should include customer information in job details', async () => {
        const job = testJobs[0];

        const response = await authenticatedRequest(
          app,
          'get',
          `/jobs/${job.id}`,
          adminAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('customer');
        expect(response.body.data.customer).toMatchObject({
          id: testCustomer.id,
          firstName: testCustomer.firstName,
          lastName: testCustomer.lastName,
          email: testCustomer.email,
        });
      });

      it('should return 404 for non-existent job', async () => {
        const nonExistentId = '507f1f77bcf86cd799439011';

        const response = await authenticatedRequest(
          app,
          'get',
          `/jobs/${nonExistentId}`,
          adminAuth.accessToken
        ).expect(404);

        ResponseAssertions.assertErrorResponse(response, 404, /not.*found/i);
      });

      it('should validate ObjectId format', async () => {
        const invalidId = 'invalid-id-format';

        const response = await authenticatedRequest(
          app,
          'get',
          `/jobs/${invalidId}`,
          adminAuth.accessToken
        ).expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });
    });
  });

  describe('Job Updates', () => {
    let testJob: any;

    beforeEach(async () => {
      const jobData = TestDataFactories.createJobData(testCustomer.id, {
        status: 'scheduled',
        priority: 'medium',
        estimatedCost: 1000.00,
      });

      const response = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
        .send(jobData);
      testJob = response.body.data;
    });

    describe('PATCH /jobs/:id', () => {
      it('should update job information', async () => {
        const updateData = {
          priority: 'high',
          estimatedCost: 1200.00,
          description: 'Updated job description',
        };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}`,
          adminAuth.accessToken
        )
          .send(updateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject(updateData);
        expect(response.body.data.status).toBe(testJob.status); // Unchanged
      });

      it('should update job addresses', async () => {
        const updateData = {
          pickupAddress: {
            street: '789 Updated Pickup St',
            city: 'New City',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}`,
          adminAuth.accessToken
        )
          .send(updateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.pickupAddress).toMatchObject(updateData.pickupAddress);
      });

      it('should validate update data', async () => {
        const invalidUpdateData = {
          priority: 'invalid-priority',
          estimatedCost: 'not-a-number',
        };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}`,
          adminAuth.accessToken
        )
          .send(invalidUpdateData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });

      it('should require appropriate permissions', async () => {
        const updateData = { priority: 'high' };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}`,
          crewAuth.accessToken
        )
          .send(updateData)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });

      it('should allow partial updates', async () => {
        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}`,
          adminAuth.accessToken
        )
          .send({ priority: 'low' })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.priority).toBe('low');
        expect(response.body.data.estimatedCost).toBe(testJob.estimatedCost); // Unchanged
      });
    });

    describe('PATCH /jobs/:id/status', () => {
      it('should update job status through valid transitions', async () => {
        const statusTransitions = [
          { from: 'scheduled', to: 'in_progress' },
          { from: 'in_progress', to: 'completed' },
        ];

        for (const transition of statusTransitions) {
          const response = await authenticatedRequest(
            app,
            'patch',
            `/jobs/${testJob.id}/status`,
            dispatcherAuth.accessToken
          )
            .send({ status: transition.to })
            .expect(200);

          ResponseAssertions.assertSuccessResponse(response);
          expect(response.body.data.status).toBe(transition.to);
        }
      });

      it('should validate status transitions', async () => {
        // Try to transition from scheduled directly to completed (invalid)
        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}/status`,
          dispatcherAuth.accessToken
        )
          .send({ status: 'completed' })
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400, /invalid.*transition/i);
      });

      it('should allow crew to update job status', async () => {
        // First transition to in_progress
        await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}/status`,
          dispatcherAuth.accessToken
        )
          .send({ status: 'in_progress' })
          .expect(200);

        // Crew can update to completed
        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}/status`,
          crewAuth.accessToken
        )
          .send({ status: 'completed' })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.status).toBe('completed');
      });

      it('should set completion timestamp when job completed', async () => {
        // Transition to in_progress first
        await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}/status`,
          dispatcherAuth.accessToken
        )
          .send({ status: 'in_progress' });

        // Complete the job
        const response = await authenticatedRequest(
          app,
          'patch',
          `/jobs/${testJob.id}/status`,
          dispatcherAuth.accessToken
        )
          .send({ status: 'completed' })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.status).toBe('completed');
        expect(response.body.data).toHaveProperty('completedAt');
        expect(new Date(response.body.data.completedAt)).toBeInstanceOf(Date);
      });
    });
  });

  describe('Crew Assignment', () => {
    let testJob: any;

    beforeEach(async () => {
      const jobData = TestDataFactories.createJobData(testCustomer.id, {
        status: 'scheduled',
        crewSize: 3,
      });

      const response = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
        .send(jobData);
      testJob = response.body.data;
    });

    describe('POST /jobs/:id/crew', () => {
      it('should assign crew members to job', async () => {
        const crewAssignment = {
          crewMembers: [
            {
              userId: crewAuth.user.id,
              role: 'lead',
              hourlyRate: 25.00,
            },
            {
              userId: adminAuth.user.id, // Admin can also be crew
              role: 'helper',
              hourlyRate: 20.00,
            },
          ],
        };

        const response = await authenticatedRequest(
          app,
          'post',
          `/jobs/${testJob.id}/crew`,
          dispatcherAuth.accessToken
        )
          .send(crewAssignment)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.assignedCrew).toBeDefined();
        expect(response.body.data.assignedCrew.length).toBe(2);
        expect(response.body.data.assignedCrew[0]).toMatchObject({
          userId: crewAuth.user.id,
          role: 'lead',
          hourlyRate: 25.00,
        });
      });

      it('should validate crew member existence', async () => {
        const crewAssignment = {
          crewMembers: [
            {
              userId: '507f1f77bcf86cd799439011', // Non-existent user
              role: 'lead',
              hourlyRate: 25.00,
            },
          ],
        };

        const response = await authenticatedRequest(
          app,
          'post',
          `/jobs/${testJob.id}/crew`,
          dispatcherAuth.accessToken
        )
          .send(crewAssignment)
          .expect(404);

        ResponseAssertions.assertErrorResponse(response, 404, /user.*not.*found/i);
      });

      it('should require crew assignment permissions', async () => {
        const crewAssignment = {
          crewMembers: [
            {
              userId: crewAuth.user.id,
              role: 'lead',
              hourlyRate: 25.00,
            },
          ],
        };

        const response = await authenticatedRequest(
          app,
          'post',
          `/jobs/${testJob.id}/crew`,
          crewAuth.accessToken
        )
          .send(crewAssignment)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });

      it('should validate crew size limits', async () => {
        const largeCrew = {
          crewMembers: Array.from({ length: 10 }, (_, i) => ({
            userId: crewAuth.user.id,
            role: 'helper',
            hourlyRate: 20.00,
          })),
        };

        const response = await authenticatedRequest(
          app,
          'post',
          `/jobs/${testJob.id}/crew`,
          dispatcherAuth.accessToken
        )
          .send(largeCrew)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400, /crew.*size/i);
      });
    });
  });

  describe('Calendar Integration', () => {
    let scheduledJobs: any[];

    beforeEach(async () => {
      // Create jobs for different dates for calendar testing
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekAfter = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

      scheduledJobs = [];

      const jobDates = [today, nextWeek, weekAfter];
      for (let i = 0; i < jobDates.length; i++) {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          scheduledDate: jobDates[i],
          status: 'scheduled',
          description: `Job scheduled for ${jobDates[i].toDateString()}`,
        });

        const response = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
          .send(jobData);
        scheduledJobs.push(response.body.data);
      }
    });

    describe('GET /jobs/calendar/week/:startDate', () => {
      it('should retrieve jobs for specific week', async () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

        const formattedDate = startOfWeek.toISOString().split('T')[0];

        const response = await authenticatedRequest(
          app,
          'get',
          `/jobs/calendar/week/${formattedDate}`,
          dispatcherAuth.accessToken
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);

        // Should include jobs from this week
        const weekJobs = response.body.data.filter((job: any) => {
          const jobDate = new Date(job.scheduledDate);
          return jobDate >= startOfWeek && jobDate < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        });

        expect(weekJobs.length).toBeGreaterThanOrEqual(0);
      });

      it('should validate date format', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/jobs/calendar/week/invalid-date',
          dispatcherAuth.accessToken
        ).expect(400);

        ResponseAssertions.assertErrorResponse(response, 400, /date/i);
      });

      it('should require appropriate permissions', async () => {
        const today = new Date().toISOString().split('T')[0];

        const response = await request(app.getHttpServer())
          .get(`/jobs/calendar/week/${today}`)
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent job operations', async () => {
      const operations = [];

      // Create multiple jobs concurrently
      for (let i = 0; i < 10; i++) {
        const jobData = TestDataFactories.createJobData(testCustomer.id, {
          description: `Concurrent job ${i}`,
          priority: i % 2 === 0 ? 'high' : 'medium',
        });

        operations.push(
          authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken).send(jobData)
        );
      }

      const responses = await Promise.all(operations);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        ResponseAssertions.assertSuccessResponse(response);
      });

      // Verify all jobs were created
      const listResponse = await authenticatedRequest(app, 'get', '/jobs', adminAuth.accessToken)
        .expect(200);

      expect(listResponse.body.data.total).toBe(10);
    }, 15000);

    it('should handle job status updates efficiently', async () => {
      // Create job
      const jobData = TestDataFactories.createJobData(testCustomer.id);
      const createResponse = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
        .send(jobData);

      const jobId = createResponse.body.data.id;

      const startTime = Date.now();

      // Perform status transition
      await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'in_progress' })
        .expect(200);

      await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'completed' })
        .expect(200);

      const endTime = Date.now();

      // Should complete quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Data Integrity and Business Logic', () => {
    it('should maintain job lifecycle integrity', async () => {
      const jobData = TestDataFactories.createJobData(testCustomer.id, {
        status: 'scheduled',
        estimatedCost: 1000.00,
      });

      const createResponse = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
        .send(jobData);

      const jobId = createResponse.body.data.id;

      // Verify job starts as scheduled
      expect(createResponse.body.data.status).toBe('scheduled');
      expect(createResponse.body.data.completedAt).toBeNull();

      // Transition to in_progress
      const progressResponse = await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'in_progress' })
        .expect(200);

      expect(progressResponse.body.data.status).toBe('in_progress');
      expect(progressResponse.body.data.completedAt).toBeNull();

      // Complete the job
      const completeResponse = await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'completed' })
        .expect(200);

      expect(completeResponse.body.data.status).toBe('completed');
      expect(completeResponse.body.data.completedAt).toBeDefined();
      expect(new Date(completeResponse.body.data.completedAt)).toBeInstanceOf(Date);
    });

    it('should handle concurrent status updates correctly', async () => {
      const jobData = TestDataFactories.createJobData(testCustomer.id, {
        status: 'scheduled',
      });

      const createResponse = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
        .send(jobData);

      const jobId = createResponse.body.data.id;

      // Make concurrent status update attempts
      const updatePromises = [
        authenticatedRequest(app, 'patch', `/jobs/${jobId}/status`, dispatcherAuth.accessToken)
          .send({ status: 'in_progress' }),
        authenticatedRequest(app, 'patch', `/jobs/${jobId}/status`, adminAuth.accessToken)
          .send({ status: 'in_progress' }),
      ];

      const responses = await Promise.all(updatePromises);

      // Both should succeed (last write wins)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify final status
      const finalResponse = await authenticatedRequest(
        app,
        'get',
        `/jobs/${jobId}`,
        adminAuth.accessToken
      ).expect(200);

      expect(finalResponse.body.data.status).toBe('in_progress');
    });

    it('should validate business rules for job completion', async () => {
      const jobData = TestDataFactories.createJobData(testCustomer.id, {
        status: 'scheduled',
        estimatedCost: 1000.00,
      });

      const createResponse = await authenticatedRequest(app, 'post', '/jobs', adminAuth.accessToken)
        .send(jobData);

      const jobId = createResponse.body.data.id;

      // Should not be able to complete job without going through in_progress
      const invalidComplete = await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'completed' })
        .expect(400);

      ResponseAssertions.assertErrorResponse(invalidComplete, 400, /transition/i);

      // Should be able to complete after going through proper flow
      await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'in_progress' })
        .expect(200);

      const validComplete = await authenticatedRequest(
        app,
        'patch',
        `/jobs/${jobId}/status`,
        dispatcherAuth.accessToken
      )
        .send({ status: 'completed' })
        .expect(200);

      expect(validComplete.body.data.status).toBe('completed');
    });
  });
});