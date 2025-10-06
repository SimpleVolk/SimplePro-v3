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
 * Customer Management Integration Tests
 *
 * Comprehensive test suite for customer management operations:
 * - Customer CRUD operations (Create, Read, Update, Delete)
 * - Customer search and filtering functionality
 * - Customer status management (lead, prospect, active, inactive)
 * - Customer type handling (residential, commercial)
 * - Address management and validation
 * - Contact information management
 * - Permission-based access control
 * - Data validation and error handling
 * - Pagination and sorting
 *
 * Tests validate complete customer lifecycle management including:
 * - Customer creation with comprehensive validation
 * - Customer search with multiple filter options
 * - Status transitions and business logic
 * - Role-based access to customer operations
 * - Data integrity and relationship management
 */

describe('Customer Management Integration Tests', () => {
  let app: INestApplication;
  let adminAuth: TestAuthData;
  let dispatcherAuth: TestAuthData;
  let crewAuth: TestAuthData;

  beforeAll(async () => {
    app = await setupTestApp();

    // Create test users with different roles
    adminAuth = await createAuthenticatedTestUser({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read:all', 'write:all', 'manage:customers'],
    });

    dispatcherAuth = await createAuthenticatedTestUser({
      email: 'dispatcher@example.com',
      role: 'dispatcher',
      permissions: ['read:customers', 'write:customers'],
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
  });

  describe('Customer Creation', () => {
    describe('POST /customers', () => {
      it('should create a new customer with valid data', async () => {
        const customerData = TestDataFactories.createCustomerData({
          email: 'customer@example.com',
          type: 'residential',
          status: 'lead',
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          type: customerData.type,
          status: customerData.status,
        });
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('createdAt');
        expect(response.body.data).toHaveProperty('updatedAt');
      });

      it('should create customer with complete address information', async () => {
        const customerData = TestDataFactories.createCustomerData({
          address: {
            street: '456 Oak Avenue',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601',
            country: 'USA',
          },
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.address).toMatchObject(customerData.address);
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          firstName: 'John',
          // Missing required fields
        };

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(incompleteData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/required/i);
      });

      it('should validate email format', async () => {
        const customerData = TestDataFactories.createCustomerData({
          email: 'invalid-email-format',
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/email/i);
      });

      it('should validate phone number format', async () => {
        const customerData = TestDataFactories.createCustomerData({
          phone: '123', // Invalid phone format
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/phone/i);
      });

      it('should validate customer type', async () => {
        const customerData = TestDataFactories.createCustomerData({
          type: 'invalid-type',
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/type/i);
      });

      it('should validate customer status', async () => {
        const customerData = TestDataFactories.createCustomerData({
          status: 'invalid-status',
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/status/i);
      });

      it('should prevent duplicate email addresses', async () => {
        const customerData = TestDataFactories.createCustomerData({
          email: 'duplicate@example.com',
        });

        // Create first customer
        await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(201);

        // Attempt to create second customer with same email
        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        )
          .send(customerData)
          .expect(409);

        ResponseAssertions.assertErrorResponse(
          response,
          409,
          /email.*already.*exists/i,
        );
      });

      it('should require appropriate permissions', async () => {
        const customerData = TestDataFactories.createCustomerData();

        // Crew member should not be able to create customers
        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          crewAuth.accessToken,
        )
          .send(customerData)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403, /permission/i);
      });

      it('should allow dispatchers to create customers', async () => {
        const customerData = TestDataFactories.createCustomerData({
          email: 'dispatcher-created@example.com',
        });

        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          dispatcherAuth.accessToken,
        )
          .send(customerData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
      });
    });
  });

  describe('Customer Retrieval', () => {
    let testCustomers: any[];

    beforeEach(async () => {
      // Create test customers for search and filter tests
      testCustomers = [];

      const customersData = [
        TestDataFactories.createCustomerData({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@example.com',
          type: 'residential',
          status: 'active',
        }),
        TestDataFactories.createCustomerData({
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'bob.smith@example.com',
          type: 'commercial',
          status: 'lead',
        }),
        TestDataFactories.createCustomerData({
          firstName: 'Carol',
          lastName: 'Wilson',
          email: 'carol.wilson@example.com',
          type: 'residential',
          status: 'prospect',
        }),
        TestDataFactories.createCustomerData({
          firstName: 'David',
          lastName: 'Brown',
          email: 'david.brown@example.com',
          type: 'commercial',
          status: 'inactive',
        }),
      ];

      for (const customerData of customersData) {
        const response = await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        ).send(customerData);
        testCustomers.push(response.body.data);
      }
    });

    describe('GET /customers', () => {
      it('should retrieve all customers for admin', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(testCustomers.length);
        expect(response.body.data.total).toBe(testCustomers.length);
      });

      it('should allow dispatchers to read customers', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers',
          dispatcherAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(testCustomers.length);
      });

      it('should deny access to crew members', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers',
          crewAuth.accessToken,
        ).expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });

      it('should filter customers by status', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?status=active',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].status).toBe('active');
      });

      it('should filter customers by type', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?type=commercial',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(2);
        response.body.data.items.forEach((customer: any) => {
          expect(customer.type).toBe('commercial');
        });
      });

      it('should search customers by name', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?search=Alice',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].firstName).toBe('Alice');
      });

      it('should search customers by email', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?search=bob.smith',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].email).toContain('bob.smith');
      });

      it('should combine multiple filters', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?type=residential&status=prospect',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].type).toBe('residential');
        expect(response.body.data.items[0].status).toBe('prospect');
      });

      it('should support pagination', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?page=1&limit=2',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(2);
        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.total).toBe(testCustomers.length);
      });

      it('should handle empty results gracefully', async () => {
        const response = await authenticatedRequest(
          app,
          'get',
          '/customers?search=nonexistent',
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertPaginationResponse(response);
        expect(response.body.data.items.length).toBe(0);
        expect(response.body.data.total).toBe(0);
      });
    });

    describe('GET /customers/:id', () => {
      it('should retrieve specific customer by ID', async () => {
        const customer = testCustomers[0];

        const response = await authenticatedRequest(
          app,
          'get',
          `/customers/${customer.id}`,
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
        });
      });

      it('should return 404 for non-existent customer', async () => {
        const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

        const response = await authenticatedRequest(
          app,
          'get',
          `/customers/${nonExistentId}`,
          adminAuth.accessToken,
        ).expect(404);

        ResponseAssertions.assertErrorResponse(response, 404, /not.*found/i);
      });

      it('should validate ObjectId format', async () => {
        const invalidId = 'invalid-id-format';

        const response = await authenticatedRequest(
          app,
          'get',
          `/customers/${invalidId}`,
          adminAuth.accessToken,
        ).expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });

      it('should require appropriate permissions', async () => {
        const customer = testCustomers[0];

        const response = await authenticatedRequest(
          app,
          'get',
          `/customers/${customer.id}`,
          crewAuth.accessToken,
        ).expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });
    });
  });

  describe('Customer Updates', () => {
    let testCustomer: any;

    beforeEach(async () => {
      const customerData = TestDataFactories.createCustomerData({
        email: 'update-test@example.com',
        status: 'lead',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        '/customers',
        adminAuth.accessToken,
      ).send(customerData);
      testCustomer = response.body.data;
    });

    describe('PATCH /customers/:id', () => {
      it('should update customer information', async () => {
        const updateData = {
          firstName: 'UpdatedFirst',
          lastName: 'UpdatedLast',
          status: 'prospect',
        };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        )
          .send(updateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject(updateData);
        expect(response.body.data.email).toBe(testCustomer.email); // Unchanged
      });

      it('should update customer address', async () => {
        const updateData = {
          address: {
            street: '789 Updated Street',
            city: 'New City',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        )
          .send(updateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.address).toMatchObject(updateData.address);
      });

      it('should update customer status', async () => {
        const statusUpdates = ['prospect', 'active', 'inactive'];

        for (const status of statusUpdates) {
          const response = await authenticatedRequest(
            app,
            'patch',
            `/customers/${testCustomer.id}`,
            adminAuth.accessToken,
          )
            .send({ status })
            .expect(200);

          ResponseAssertions.assertSuccessResponse(response);
          expect(response.body.data.status).toBe(status);
        }
      });

      it('should validate update data', async () => {
        const invalidUpdateData = {
          email: 'invalid-email-format',
          status: 'invalid-status',
        };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        )
          .send(invalidUpdateData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });

      it('should prevent duplicate email on update', async () => {
        // Create another customer
        const otherCustomerData = TestDataFactories.createCustomerData({
          email: 'other@example.com',
        });
        await authenticatedRequest(
          app,
          'post',
          '/customers',
          adminAuth.accessToken,
        ).send(otherCustomerData);

        // Try to update first customer with second customer's email
        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        )
          .send({ email: 'other@example.com' })
          .expect(409);

        ResponseAssertions.assertErrorResponse(
          response,
          409,
          /email.*already.*exists/i,
        );
      });

      it('should require appropriate permissions', async () => {
        const updateData = { firstName: 'Unauthorized' };

        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          crewAuth.accessToken,
        )
          .send(updateData)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });

      it('should allow partial updates', async () => {
        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        )
          .send({ firstName: 'OnlyFirstName' })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data.firstName).toBe('OnlyFirstName');
        expect(response.body.data.lastName).toBe(testCustomer.lastName); // Unchanged
      });

      it('should update timestamp on modification', async () => {
        const originalUpdatedAt = testCustomer.updatedAt;

        // Wait a moment to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = await authenticatedRequest(
          app,
          'patch',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        )
          .send({ firstName: 'TimestampTest' })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(
          new Date(response.body.data.updatedAt).getTime(),
        ).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
      });
    });
  });

  describe('Customer Deletion', () => {
    let testCustomer: any;

    beforeEach(async () => {
      const customerData = TestDataFactories.createCustomerData({
        email: 'delete-test@example.com',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        '/customers',
        adminAuth.accessToken,
      ).send(customerData);
      testCustomer = response.body.data;
    });

    describe('DELETE /customers/:id', () => {
      it('should soft delete customer (set status to inactive)', async () => {
        const response = await authenticatedRequest(
          app,
          'delete',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        ).expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.message).toMatch(/deactivated/i);

        // Verify customer is marked as inactive
        const getResponse = await authenticatedRequest(
          app,
          'get',
          `/customers/${testCustomer.id}`,
          adminAuth.accessToken,
        ).expect(200);

        expect(getResponse.body.data.status).toBe('inactive');
      });

      it('should require admin permissions for deletion', async () => {
        const response = await authenticatedRequest(
          app,
          'delete',
          `/customers/${testCustomer.id}`,
          dispatcherAuth.accessToken,
        ).expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });

      it('should handle deletion of non-existent customer', async () => {
        const nonExistentId = '507f1f77bcf86cd799439011';

        const response = await authenticatedRequest(
          app,
          'delete',
          `/customers/${nonExistentId}`,
          adminAuth.accessToken,
        ).expect(404);

        ResponseAssertions.assertErrorResponse(response, 404);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent customer operations', async () => {
      const operations = [];

      // Create multiple customers concurrently
      for (let i = 0; i < 10; i++) {
        const customerData = TestDataFactories.createCustomerData({
          email: `concurrent${i}@example.com`,
        });

        operations.push(
          authenticatedRequest(
            app,
            'post',
            '/customers',
            adminAuth.accessToken,
          ).send(customerData),
        );
      }

      const responses = await Promise.all(operations);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        ResponseAssertions.assertSuccessResponse(response);
      });

      // Verify all customers were created
      const listResponse = await authenticatedRequest(
        app,
        'get',
        '/customers',
        adminAuth.accessToken,
      ).expect(200);

      expect(listResponse.body.data.total).toBe(10);
    }, 15000);

    it('should handle large result sets efficiently', async () => {
      // Create many customers
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        const customerData = TestDataFactories.createCustomerData({
          email: `large-set${i}@example.com`,
          firstName: `Customer${i}`,
        });

        createPromises.push(
          authenticatedRequest(
            app,
            'post',
            '/customers',
            adminAuth.accessToken,
          ).send(customerData),
        );
      }

      await Promise.all(createPromises);

      const startTime = Date.now();

      // Retrieve all customers
      const response = await authenticatedRequest(
        app,
        'get',
        '/customers?limit=100',
        adminAuth.accessToken,
      ).expect(200);

      const endTime = Date.now();

      ResponseAssertions.assertPaginationResponse(response);
      expect(response.body.data.total).toBe(50);
      expect(response.body.data.items.length).toBe(50);

      // Should complete in reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    }, 30000);
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on status changes', async () => {
      const customerData = TestDataFactories.createCustomerData({
        email: 'integrity@example.com',
        status: 'lead',
      });

      const createResponse = await authenticatedRequest(
        app,
        'post',
        '/customers',
        adminAuth.accessToken,
      ).send(customerData);

      const customerId = createResponse.body.data.id;

      // Update status through the lifecycle
      const statusFlow = ['lead', 'prospect', 'active', 'inactive'];

      for (const status of statusFlow) {
        const updateResponse = await authenticatedRequest(
          app,
          'patch',
          `/customers/${customerId}`,
          adminAuth.accessToken,
        )
          .send({ status })
          .expect(200);

        expect(updateResponse.body.data.status).toBe(status);

        // Verify status persists
        const getResponse = await authenticatedRequest(
          app,
          'get',
          `/customers/${customerId}`,
          adminAuth.accessToken,
        ).expect(200);

        expect(getResponse.body.data.status).toBe(status);
      }
    });

    it('should handle concurrent updates correctly', async () => {
      const customerData = TestDataFactories.createCustomerData({
        email: 'concurrent-update@example.com',
      });

      const createResponse = await authenticatedRequest(
        app,
        'post',
        '/customers',
        adminAuth.accessToken,
      ).send(customerData);

      const customerId = createResponse.body.data.id;

      // Make concurrent updates
      const updatePromises = [
        authenticatedRequest(
          app,
          'patch',
          `/customers/${customerId}`,
          adminAuth.accessToken,
        ).send({ firstName: 'Update1' }),
        authenticatedRequest(
          app,
          'patch',
          `/customers/${customerId}`,
          adminAuth.accessToken,
        ).send({ lastName: 'Update2' }),
        authenticatedRequest(
          app,
          'patch',
          `/customers/${customerId}`,
          adminAuth.accessToken,
        ).send({ status: 'prospect' }),
      ];

      const responses = await Promise.all(updatePromises);

      // All should succeed (last write wins)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify final state
      const finalResponse = await authenticatedRequest(
        app,
        'get',
        `/customers/${customerId}`,
        adminAuth.accessToken,
      ).expect(200);

      expect(finalResponse.body.data).toHaveProperty('firstName');
      expect(finalResponse.body.data).toHaveProperty('lastName');
      expect(finalResponse.body.data).toHaveProperty('status');
    });
  });
});
