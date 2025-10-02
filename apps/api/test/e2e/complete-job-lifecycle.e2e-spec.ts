import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { io, Socket } from 'socket.io-client';

describe('Complete Moving Job Lifecycle (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let adminUserId: string;
  let customerId: string;
  let opportunityId: string;
  let estimateId: string;
  let jobId: string;
  let crewMemberId: string;
  let crewAuthToken: string;
  let socket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Step 1: Create admin user and login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Admin123!',
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;
    adminUserId = loginResponse.body.user.userId;

    // Step 2: Create crew member for later assignment
    const crewResponse = await request(app.getHttpServer())
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        username: 'crewlead001',
        email: 'crewlead@simplepro.com',
        password: 'Crew123!',
        role: 'crew',
        firstName: 'John',
        lastName: 'Smith',
        position: 'crew_lead',
        skills: {
          canDrive: true,
          hasCommercialLicense: true,
          hasMovingExperience: true,
          specializations: ['piano', 'antiques'],
        },
        performanceMetrics: {
          rating: 5.0,
          jobsCompleted: 150,
          averageJobDuration: 4.5,
        },
      })
      .expect(201);

    crewMemberId = crewResponse.body.userId;

    // Login as crew member
    const crewLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'crewlead001',
        password: 'Crew123!',
      })
      .expect(200);

    crewAuthToken = crewLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
    await app.close();
  });

  describe('Workflow: Lead to Completed Job', () => {
    it('should create customer successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
          phone: '555-0123',
          type: 'residential',
          status: 'lead',
          leadSource: 'website',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'USA',
          },
        })
        .expect(201);

      customerId = response.body.customerId;

      expect(response.body).toMatchObject({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        type: 'residential',
        status: 'lead',
        leadSource: 'website',
      });
    });

    it('should create opportunity with inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          serviceType: 'local',
          status: 'new',
          priority: 'high',
          estimatedMoveDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
          pickupLocation: {
            address: '123 Main St, San Francisco, CA 94102',
            accessDifficulty: 'medium',
            stairs: 1,
            elevator: false,
            parkingDistance: 50,
          },
          deliveryLocation: {
            address: '456 Oak Ave, San Francisco, CA 94110',
            accessDifficulty: 'easy',
            stairs: 0,
            elevator: true,
            parkingDistance: 10,
          },
          inventory: {
            rooms: [
              {
                roomType: 'living_room',
                items: [
                  { name: 'Sofa', quantity: 1, weight: 150, cubicFeet: 50 },
                  { name: 'TV', quantity: 1, weight: 30, cubicFeet: 10 },
                  { name: 'Coffee Table', quantity: 1, weight: 40, cubicFeet: 15 },
                ],
              },
              {
                roomType: 'bedroom',
                items: [
                  { name: 'Queen Bed', quantity: 1, weight: 200, cubicFeet: 80 },
                  { name: 'Dresser', quantity: 1, weight: 120, cubicFeet: 40 },
                ],
              },
            ],
            totalWeight: 540,
            totalCubicFeet: 195,
            specialItems: [
              { itemType: 'piano', description: 'Upright Piano', value: 3000 },
            ],
          },
          additionalServices: ['packing', 'assembly'],
        })
        .expect(201);

      opportunityId = response.body.opportunityId;

      expect(response.body).toMatchObject({
        customerId,
        serviceType: 'local',
        status: 'new',
        priority: 'high',
      });
      expect(response.body.inventory.totalWeight).toBe(540);
    });

    it('should calculate estimate using pricing engine', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/estimates/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          opportunityId,
          serviceType: 'local',
          weight: 540,
          cubicFeet: 195,
          pickupLocation: {
            address: '123 Main St, San Francisco, CA 94102',
            accessDifficulty: 'medium',
            stairs: 1,
          },
          deliveryLocation: {
            address: '456 Oak Ave, San Francisco, CA 94110',
            accessDifficulty: 'easy',
            stairs: 0,
          },
          specialItems: ['piano'],
          additionalServices: ['packing', 'assembly'],
          estimatedCrewSize: 3,
          estimatedHours: 6,
        })
        .expect(200);

      estimateId = response.body.estimate.estimateId;

      expect(response.body.success).toBe(true);
      expect(response.body.estimate).toHaveProperty('calculations');
      expect(response.body.estimate.calculations).toHaveProperty('finalPrice');
      expect(response.body.estimate.calculations.finalPrice).toBeGreaterThan(0);
      expect(response.body.estimate.calculations.appliedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: expect.any(String),
            ruleName: expect.any(String),
            priceImpact: expect.any(Number),
          }),
        ])
      );
      expect(response.body.estimate.metadata.deterministic).toBe(true);
      expect(response.body.estimate.metadata.hash).toBeTruthy();
    });

    it('should approve estimate and convert to job', async () => {
      // First update opportunity to quoted status
      await request(app.getHttpServer())
        .patch(`/api/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'quoted',
          estimateId,
        })
        .expect(200);

      // Now convert to job
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          opportunityId,
          estimateId,
          serviceType: 'local',
          status: 'scheduled',
          priority: 'high',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
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
        })
        .expect(201);

      jobId = response.body.jobId;

      expect(response.body).toMatchObject({
        customerId,
        opportunityId,
        estimateId,
        status: 'scheduled',
        priority: 'high',
      });
    });

    it('should auto-assign crew based on scoring algorithm', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/crew-scheduling/auto-assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId,
          requiredSkills: ['canDrive', 'hasCommercialLicense'],
          preferredSpecializations: ['piano'],
          crewSize: 3,
          jobDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          jobLocation: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        })
        .expect(200);

      expect(response.body.assignedCrew).toBeDefined();
      expect(response.body.assignedCrew.length).toBeGreaterThan(0);

      // Verify crew lead is assigned (should have highest score)
      const crewLeadAssignment = response.body.assignedCrew.find(
        (assignment: any) => assignment.crewMemberId === crewMemberId
      );
      expect(crewLeadAssignment).toBeDefined();
      expect(crewLeadAssignment.score).toBeGreaterThanOrEqual(80);
      expect(crewLeadAssignment.role).toBe('crew_lead');
    });

    it('should send notifications to crew via all channels', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: crewMemberId,
          type: 'job_assigned',
          title: 'New Job Assignment',
          message: `You have been assigned to job ${jobId}`,
          jobId,
          channels: ['in_app', 'email', 'sms', 'push'],
          priority: 'high',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        recipientId: crewMemberId,
        type: 'job_assigned',
        channels: expect.arrayContaining(['in_app', 'email', 'sms', 'push']),
        deliveryStatus: expect.objectContaining({
          in_app: 'delivered',
          // email, sms, push would be 'sent' in test environment with mocks
        }),
      });

      // Verify notification appears in crew's notification list
      const notificationsResponse = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${crewAuthToken}`)
        .expect(200);

      expect(notificationsResponse.body.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'job_assigned',
            jobId,
            isRead: false,
          }),
        ])
      );
    });

    it('should establish WebSocket connection and receive real-time updates', (done) => {
      socket = io(`http://localhost:${app.getHttpServer().address().port}`, {
        auth: {
          token: crewAuthToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);

        // Subscribe to job updates
        socket.emit('subscribe.job', jobId);

        // Update job status from another request
        request(app.getHttpServer())
          .patch(`/api/jobs/${jobId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'in_progress' })
          .then(() => {
            // WebSocket event should be received
          });
      });

      socket.on('job.updated', (data) => {
        expect(data).toMatchObject({
          jobId,
          status: 'in_progress',
        });
        socket.disconnect();
        done();
      });

      socket.on('connect_error', (error) => {
        done(error);
      });
    }, 15000);

    it('should simulate crew check-in with GPS verification', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/checkin`)
        .set('Authorization', `Bearer ${crewAuthToken}`)
        .send({
          crewMemberId,
          location: {
            lat: 37.7749,
            lng: -122.4194,
          },
          timestamp: new Date().toISOString(),
          jobSitePhotos: [], // Would normally include photo IDs
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        crewMemberId,
        checkinStatus: 'verified',
        withinGeofence: true,
      });
      expect(response.body.distanceFromJobSite).toBeLessThan(500); // Within 500m
    });

    it('should upload photos during move', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${crewAuthToken}`)
        .field('jobId', jobId)
        .field('documentType', 'job_photo')
        .field('category', 'in_progress')
        .attach('file', Buffer.from('fake-image-data'), {
          filename: 'job-photo-1.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        documentId: expect.any(String),
        jobId,
        documentType: 'job_photo',
        fileType: 'image/jpeg',
        uploadedBy: crewMemberId,
      });
      expect(response.body.storageKey).toBeTruthy();
    });

    it('should capture customer signature', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/signature')
        .set('Authorization', `Bearer ${crewAuthToken}`)
        .send({
          jobId,
          signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          signedBy: 'Jane Doe',
          signatureType: 'completion',
          timestamp: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body).toMatchObject({
        documentId: expect.any(String),
        jobId,
        documentType: 'signature',
        signedBy: 'Jane Doe',
        signatureType: 'completion',
      });
    });

    it('should complete job and calculate crew payroll', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${crewAuthToken}`)
        .send({
          completionTime: new Date().toISOString(),
          actualHours: 6.5,
          finalNotes: 'Job completed successfully. Customer very satisfied.',
          damagesReported: false,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        status: 'completed',
        actualHours: 6.5,
      });

      // Verify payroll calculation
      expect(response.body.payroll).toBeDefined();
      expect(response.body.payroll).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            crewMemberId,
            hours: 6.5,
            hourlyRate: expect.any(Number),
            totalPay: expect.any(Number),
            overtime: expect.any(Boolean),
          }),
        ])
      );

      // Regular pay for 6.5 hours (assuming $25/hour base rate)
      const crewPayroll = response.body.payroll.find(
        (p: any) => p.crewMemberId === crewMemberId
      );
      expect(crewPayroll.totalPay).toBe(6.5 * crewPayroll.hourlyRate);
    });

    it('should send completion notification to customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: customerId,
          type: 'job_completed',
          title: 'Your Move is Complete',
          message: 'Thank you for choosing our service. Your move has been completed successfully.',
          jobId,
          channels: ['email'],
          includeInvoice: true,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        recipientId: customerId,
        type: 'job_completed',
        channels: ['email'],
        deliveryStatus: expect.objectContaining({
          email: 'sent',
        }),
      });
    });

    it('should verify job final status and complete data integrity', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        customerId,
        opportunityId,
        estimateId,
        status: 'completed',
        assignedCrew: expect.arrayContaining([
          expect.objectContaining({
            crewMemberId,
          }),
        ]),
      });

      // Verify documents are linked
      expect(response.body.documents).toBeDefined();
      expect(response.body.documents.length).toBeGreaterThan(0);

      // Verify signatures
      const signature = response.body.documents.find(
        (doc: any) => doc.documentType === 'signature'
      );
      expect(signature).toBeDefined();

      // Verify photos
      const photos = response.body.documents.filter(
        (doc: any) => doc.documentType === 'job_photo'
      );
      expect(photos.length).toBeGreaterThan(0);
    });
  });
});
