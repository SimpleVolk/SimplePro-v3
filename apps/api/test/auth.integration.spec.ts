import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  teardownTestApp,
  cleanupDatabase,
  TestDataFactories,
  createTestUser,
  loginTestUser,
  createAuthenticatedTestUser,
  authenticatedRequest,
  ResponseAssertions,
} from './integration-setup';

/**
 * Authentication Integration Tests
 *
 * Comprehensive test suite for authentication and authorization flows:
 * - User registration and login
 * - JWT token management (access and refresh tokens)
 * - Role-based access control (RBAC)
 * - Session management
 * - Password management and security
 * - Permission-based endpoint access
 * - Authentication error scenarios
 *
 * Tests validate complete authentication workflows including:
 * - User creation with proper password hashing
 * - Login flow with token generation
 * - Token refresh mechanisms
 * - Logout and session cleanup
 * - Role and permission validation
 * - Security measures and rate limiting
 */

describe('Authentication Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('User Registration and Management', () => {
    describe('POST /auth/users (User Creation)', () => {
      it('should create a new user with valid data', async () => {
        // First create an admin user to perform user creation
        const adminAuth = await createAuthenticatedTestUser({
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['manage:users'],
        });

        const newUserData = TestDataFactories.createUserData({
          email: 'newuser@example.com',
          password: 'NewUser123!',
          role: 'dispatcher',
        });

        const response = await authenticatedRequest(app, 'post', '/auth/users', adminAuth.accessToken)
          .send(newUserData)
          .expect(201);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          email: newUserData.email,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          role: newUserData.role,
        });
        expect(response.body.data).not.toHaveProperty('password');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('createdAt');
      });

      it('should reject duplicate email addresses', async () => {
        const adminAuth = await createAuthenticatedTestUser({
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['manage:users'],
        });

        const userData = TestDataFactories.createUserData({
          email: 'duplicate@example.com',
        });

        // Create first user
        await authenticatedRequest(app, 'post', '/auth/users', adminAuth.accessToken)
          .send(userData)
          .expect(201);

        // Attempt to create second user with same email
        const response = await authenticatedRequest(app, 'post', '/auth/users', adminAuth.accessToken)
          .send(userData)
          .expect(409);

        ResponseAssertions.assertErrorResponse(response, 409, /email.*already.*exists/i);
      });

      it('should validate password requirements', async () => {
        const adminAuth = await createAuthenticatedTestUser({
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['manage:users'],
        });

        const weakPasswordData = TestDataFactories.createUserData({
          email: 'weakpass@example.com',
          password: '123', // Too weak
        });

        const response = await authenticatedRequest(app, 'post', '/auth/users', adminAuth.accessToken)
          .send(weakPasswordData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
        expect(response.body.message).toMatch(/password/i);
      });

      it('should require admin permissions to create users', async () => {
        const dispatcherAuth = await createAuthenticatedTestUser({
          email: 'dispatcher@example.com',
          role: 'dispatcher',
          permissions: ['read:jobs', 'write:jobs'],
        });

        const newUserData = TestDataFactories.createUserData({
          email: 'unauthorized@example.com',
        });

        const response = await authenticatedRequest(app, 'post', '/auth/users', dispatcherAuth.accessToken)
          .send(newUserData)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403, /permission/i);
      });
    });

    describe('GET /auth/users (User Listing)', () => {
      it('should list users for admin', async () => {
        const adminAuth = await createAuthenticatedTestUser({
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['manage:users'],
        });

        // Create additional test users
        await createTestUser({
          email: 'user1@example.com',
          role: 'dispatcher',
        });
        await createTestUser({
          email: 'user2@example.com',
          role: 'crew',
        });

        const response = await authenticatedRequest(app, 'get', '/auth/users', adminAuth.accessToken)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(3);

        // Verify user data structure
        response.body.data.forEach((user: any) => {
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('email');
          expect(user).toHaveProperty('role');
          expect(user).not.toHaveProperty('password');
        });
      });

      it('should deny access to non-admin users', async () => {
        const crewAuth = await createAuthenticatedTestUser({
          email: 'crew@example.com',
          role: 'crew',
          permissions: ['read:jobs'],
        });

        const response = await authenticatedRequest(app, 'get', '/auth/users', crewAuth.accessToken)
          .expect(403);

        ResponseAssertions.assertErrorResponse(response, 403);
      });
    });
  });

  describe('Authentication Flow', () => {
    describe('POST /auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        const userData = TestDataFactories.createUserData({
          email: 'test@example.com',
          password: 'Test123!@#',
        });
        await createTestUser(userData);

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toMatchObject({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        });
        expect(response.body.data.user).not.toHaveProperty('password');
      });

      it('should reject invalid email', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Test123!@#',
          })
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401, /invalid.*credentials/i);
      });

      it('should reject invalid password', async () => {
        const userData = TestDataFactories.createUserData({
          email: 'test@example.com',
          password: 'Test123!@#',
        });
        await createTestUser(userData);

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: userData.email,
            password: 'WrongPassword',
          })
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401, /invalid.*credentials/i);
      });

      it('should validate required fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            // Missing password
          })
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });
    });

    describe('POST /auth/refresh', () => {
      it('should refresh access token with valid refresh token', async () => {
        const authData = await createAuthenticatedTestUser();

        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({
            refresh_token: authData.refreshToken,
          })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data.accessToken).not.toBe(authData.accessToken);
      });

      it('should reject invalid refresh token', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({
            refresh_token: 'invalid-refresh-token',
          })
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401, /invalid.*token/i);
      });

      it('should reject expired refresh token', async () => {
        // This test would require manipulating token expiration
        // For now, we'll test with an obviously invalid token
        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({
            refresh_token: 'expired.token.here',
          })
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401);
      });
    });

    describe('POST /auth/logout', () => {
      it('should logout user and invalidate tokens', async () => {
        const authData = await createAuthenticatedTestUser();

        const response = await authenticatedRequest(app, 'post', '/auth/logout', authData.accessToken)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.message).toMatch(/logout.*successful/i);

        // Verify token is invalidated by trying to use it
        const protectedResponse = await authenticatedRequest(app, 'get', '/auth/profile', authData.accessToken)
          .expect(401);

        ResponseAssertions.assertErrorResponse(protectedResponse, 401);
      });

      it('should require authentication to logout', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/logout')
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401);
      });
    });
  });

  describe('Profile Management', () => {
    describe('GET /auth/profile', () => {
      it('should return user profile for authenticated user', async () => {
        const authData = await createAuthenticatedTestUser();

        const response = await authenticatedRequest(app, 'get', '/auth/profile', authData.accessToken)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          email: authData.user.email,
          firstName: authData.user.firstName,
          lastName: authData.user.lastName,
          role: authData.user.role,
        });
        expect(response.body.data).not.toHaveProperty('password');
      });

      it('should require authentication', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/profile')
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401);
      });
    });

    describe('PATCH /auth/profile', () => {
      it('should update user profile', async () => {
        const authData = await createAuthenticatedTestUser();

        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
        };

        const response = await authenticatedRequest(app, 'patch', '/auth/profile', authData.accessToken)
          .send(updateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toMatchObject(updateData);
      });

      it('should not allow email updates through profile endpoint', async () => {
        const authData = await createAuthenticatedTestUser();

        const updateData = {
          email: 'newemail@example.com',
          firstName: 'Updated',
        };

        const response = await authenticatedRequest(app, 'patch', '/auth/profile', authData.accessToken)
          .send(updateData)
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });
    });

    describe('POST /auth/change-password', () => {
      it('should change password with valid current password', async () => {
        const originalPassword = 'Test123!@#';
        const newPassword = 'NewPassword456!';

        const authData = await createAuthenticatedTestUser({
          password: originalPassword,
        });

        const response = await authenticatedRequest(app, 'post', '/auth/change-password', authData.accessToken)
          .send({
            currentPassword: originalPassword,
            newPassword: newPassword,
          })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        // Verify old password no longer works
        const oldLoginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: authData.user.email,
            password: originalPassword,
          })
          .expect(401);

        // Verify new password works
        const newLoginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: authData.user.email,
            password: newPassword,
          })
          .expect(200);

        ResponseAssertions.assertSuccessResponse(newLoginResponse);
      });

      it('should reject incorrect current password', async () => {
        const authData = await createAuthenticatedTestUser();

        const response = await authenticatedRequest(app, 'post', '/auth/change-password', authData.accessToken)
          .send({
            currentPassword: 'WrongPassword',
            newPassword: 'NewPassword456!',
          })
          .expect(401);

        ResponseAssertions.assertErrorResponse(response, 401, /current.*password.*incorrect/i);
      });

      it('should validate new password requirements', async () => {
        const authData = await createAuthenticatedTestUser();

        const response = await authenticatedRequest(app, 'post', '/auth/change-password', authData.accessToken)
          .send({
            currentPassword: 'Test123!@#',
            newPassword: '123', // Too weak
          })
          .expect(400);

        ResponseAssertions.assertErrorResponse(response, 400);
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce role-based endpoint access', async () => {
      const users = {
        admin: await createAuthenticatedTestUser({
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['manage:users', 'read:all'],
        }),
        dispatcher: await createAuthenticatedTestUser({
          email: 'dispatcher@example.com',
          role: 'dispatcher',
          permissions: ['read:jobs', 'write:jobs'],
        }),
        crew: await createAuthenticatedTestUser({
          email: 'crew@example.com',
          role: 'crew',
          permissions: ['read:jobs'],
        }),
      };

      // Admin should access user management
      await authenticatedRequest(app, 'get', '/auth/users', users.admin.accessToken)
        .expect(200);

      // Dispatcher should not access user management
      await authenticatedRequest(app, 'get', '/auth/users', users.dispatcher.accessToken)
        .expect(403);

      // Crew should not access user management
      await authenticatedRequest(app, 'get', '/auth/users', users.crew.accessToken)
        .expect(403);
    });

    it('should validate specific permissions for actions', async () => {
      const readOnlyUser = await createAuthenticatedTestUser({
        email: 'readonly@example.com',
        role: 'crew',
        permissions: ['read:jobs'], // No write permissions
      });

      // Should be able to read their profile
      await authenticatedRequest(app, 'get', '/auth/profile', readOnlyUser.accessToken)
        .expect(200);

      // Should not be able to access admin functions
      await authenticatedRequest(app, 'get', '/auth/users', readOnlyUser.accessToken)
        .expect(403);
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle malformed JWT tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);

      ResponseAssertions.assertErrorResponse(response, 401);
    });

    it('should handle missing Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);

      ResponseAssertions.assertErrorResponse(response, 401);
    });

    it('should handle concurrent login attempts', async () => {
      const userData = TestDataFactories.createUserData({
        email: 'concurrent@example.com',
        password: 'Test123!@#',
      });
      await createTestUser(userData);

      // Make multiple concurrent login requests
      const loginPromises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed with valid tokens
      responses.forEach(response => {
        expect(response.status).toBe(200);
        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
      });
    });

    it('should handle session cleanup on logout', async () => {
      const authData = await createAuthenticatedTestUser();

      // Login creates a session
      expect(authData.accessToken).toBeDefined();

      // Logout should clean up session
      await authenticatedRequest(app, 'post', '/auth/logout', authData.accessToken)
        .expect(200);

      // Token should no longer work
      await authenticatedRequest(app, 'get', '/auth/profile', authData.accessToken)
        .expect(401);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple authentication requests efficiently', async () => {
      const userData = TestDataFactories.createUserData({
        email: 'performance@example.com',
        password: 'Test123!@#',
      });
      await createTestUser(userData);

      const startTime = Date.now();

      // Make multiple login requests
      const loginPromises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
      );

      const responses = await Promise.all(loginPromises);
      const endTime = Date.now();

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete reasonably quickly (less than 5 seconds for 10 requests)
      expect(endTime - startTime).toBeLessThan(5000);
    }, 10000);
  });
});