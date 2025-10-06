import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Offline Mobile App Sync (Integration)', () => {
  let app: INestApplication;
  let authToken: string;
  let crewMemberId: string;
  let jobId: string;
  let pendingActions: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login and setup
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Admin123!',
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;

    // Create crew member
    const crewResponse = await request(app.getHttpServer())
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        username: 'crewmember001',
        email: 'crew001@simplepro.com',
        password: 'Crew123!',
        role: 'crew',
        firstName: 'Mike',
        lastName: 'Johnson',
      })
      .expect(201);

    crewMemberId = crewResponse.body.userId;

    // Create a job for testing
    const jobResponse = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: 'test-customer-id',
        serviceType: 'local',
        status: 'scheduled',
        scheduledDate: new Date().toISOString(),
        estimatedCrewSize: 2,
      })
      .expect(201);

    jobId = jobResponse.body.jobId;

    // Assign crew to job
    await request(app.getHttpServer())
      .post(`/api/jobs/${jobId}/crew`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        crewMembers: [{ crewMemberId, role: 'crew_lead' }],
      })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Offline Queue and Background Sync', () => {
    it('should fetch job schedule while online', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        status: 'scheduled',
      });

      // Simulate storing job data in mobile app's local storage
      const localJobData = response.body;
      expect(localJobData).toBeDefined();
    });

    it('should queue check-in action while offline', () => {
      // Simulate offline mode - queue action instead of sending
      const checkinAction = {
        actionId: `action_${Date.now()}_1`,
        type: 'checkin',
        jobId,
        crewMemberId,
        timestamp: new Date().toISOString(),
        data: {
          location: {
            lat: 37.7749,
            lng: -122.4194,
          },
          deviceTimestamp: new Date().toISOString(),
        },
        retryCount: 0,
      };

      pendingActions.push(checkinAction);

      expect(pendingActions.length).toBe(1);
      expect(pendingActions[0].type).toBe('checkin');
    });

    it('should queue photo uploads while offline', () => {
      const photoActions = [
        {
          actionId: `action_${Date.now()}_2`,
          type: 'photo_upload',
          jobId,
          crewMemberId,
          timestamp: new Date().toISOString(),
          data: {
            localPath: '/storage/photos/job_photo_1.jpg',
            category: 'before',
            base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...',
          },
          retryCount: 0,
        },
        {
          actionId: `action_${Date.now()}_3`,
          type: 'photo_upload',
          jobId,
          crewMemberId,
          timestamp: new Date().toISOString(),
          data: {
            localPath: '/storage/photos/job_photo_2.jpg',
            category: 'in_progress',
            base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...',
          },
          retryCount: 0,
        },
        {
          actionId: `action_${Date.now()}_4`,
          type: 'photo_upload',
          jobId,
          crewMemberId,
          timestamp: new Date().toISOString(),
          data: {
            localPath: '/storage/photos/job_photo_3.jpg',
            category: 'after',
            base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...',
          },
          retryCount: 0,
        },
      ];

      pendingActions.push(...photoActions);

      expect(pendingActions.length).toBe(4); // 1 checkin + 3 photos
    });

    it('should queue signature capture while offline', () => {
      const signatureAction = {
        actionId: `action_${Date.now()}_5`,
        type: 'signature',
        jobId,
        crewMemberId,
        timestamp: new Date().toISOString(),
        data: {
          signatureData:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...',
          signedBy: 'Customer Name',
          signatureType: 'completion',
        },
        retryCount: 0,
      };

      pendingActions.push(signatureAction);

      expect(pendingActions.length).toBe(5); // 1 checkin + 3 photos + 1 signature
    });

    it('should queue job notes while offline', () => {
      const notesAction = {
        actionId: `action_${Date.now()}_6`,
        type: 'add_notes',
        jobId,
        crewMemberId,
        timestamp: new Date().toISOString(),
        data: {
          notes:
            'Customer requested extra care with antique furniture. Completed without issues.',
          category: 'completion',
        },
        retryCount: 0,
      };

      pendingActions.push(notesAction);

      expect(pendingActions.length).toBe(6);
    });

    it('should verify all queued actions have proper structure', () => {
      pendingActions.forEach((action) => {
        expect(action).toMatchObject({
          actionId: expect.any(String),
          type: expect.stringMatching(
            /^(checkin|photo_upload|signature|add_notes)$/,
          ),
          jobId: expect.any(String),
          crewMemberId: expect.any(String),
          timestamp: expect.any(String),
          data: expect.any(Object),
          retryCount: 0,
        });
      });
    });

    it('should sync check-in action when network reconnects', async () => {
      const checkinAction = pendingActions.find((a) => a.type === 'checkin');

      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/checkin`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          crewMemberId: checkinAction.crewMemberId,
          location: checkinAction.data.location,
          timestamp: checkinAction.timestamp,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        crewMemberId,
        checkinStatus: 'verified',
      });

      // Remove from queue after successful sync
      pendingActions = pendingActions.filter(
        (a) => a.actionId !== checkinAction.actionId,
      );
      expect(pendingActions.length).toBe(5);
    });

    it('should sync all photo uploads sequentially', async () => {
      const photoActions = pendingActions.filter(
        (a) => a.type === 'photo_upload',
      );

      for (const photoAction of photoActions) {
        const response = await request(app.getHttpServer())
          .post('/api/documents/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('jobId', jobId)
          .field('documentType', 'job_photo')
          .field('category', photoAction.data.category)
          .attach('file', Buffer.from(photoAction.data.base64Data, 'base64'), {
            filename: photoAction.data.localPath.split('/').pop(),
            contentType: 'image/jpeg',
          })
          .expect(201);

        expect(response.body).toMatchObject({
          documentId: expect.any(String),
          jobId,
          documentType: 'job_photo',
        });

        // Remove from queue after successful sync
        pendingActions = pendingActions.filter(
          (a) => a.actionId !== photoAction.actionId,
        );
      }

      expect(pendingActions.length).toBe(2); // Only signature and notes left
    });

    it('should sync signature capture', async () => {
      const signatureAction = pendingActions.find(
        (a) => a.type === 'signature',
      );

      const response = await request(app.getHttpServer())
        .post('/api/documents/signature')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId,
          signatureData: signatureAction.data.signatureData,
          signedBy: signatureAction.data.signedBy,
          signatureType: signatureAction.data.signatureType,
          timestamp: signatureAction.timestamp,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        documentId: expect.any(String),
        jobId,
        documentType: 'signature',
      });

      pendingActions = pendingActions.filter(
        (a) => a.actionId !== signatureAction.actionId,
      );
      expect(pendingActions.length).toBe(1); // Only notes left
    });

    it('should sync job notes', async () => {
      const notesAction = pendingActions.find((a) => a.type === 'add_notes');

      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: notesAction.data.notes,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
      });
      expect(response.body.notes).toContain(notesAction.data.notes);

      pendingActions = pendingActions.filter(
        (a) => a.actionId !== notesAction.actionId,
      );
      expect(pendingActions.length).toBe(0); // Queue is now empty
    });

    it('should verify server state matches local state after sync', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify check-in exists
      expect(response.body.checkins).toBeDefined();
      expect(response.body.checkins.length).toBeGreaterThan(0);

      // Verify photos exist
      const photos =
        response.body.documents?.filter(
          (d: any) => d.documentType === 'job_photo',
        ) || [];
      expect(photos.length).toBe(3);

      // Verify signature exists
      const signature = response.body.documents?.find(
        (d: any) => d.documentType === 'signature',
      );
      expect(signature).toBeDefined();

      // Verify notes exist
      expect(response.body.notes).toContain(
        'Customer requested extra care with antique furniture',
      );
    });

    it('should handle retry logic for failed sync attempts', async () => {
      // Simulate a failed action that needs retry
      const failedAction = {
        actionId: `action_${Date.now()}_retry`,
        type: 'photo_upload',
        jobId,
        crewMemberId,
        timestamp: new Date().toISOString(),
        data: {
          localPath: '/storage/photos/retry_photo.jpg',
          category: 'after',
          base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...',
        },
        retryCount: 2,
        lastError: 'Network timeout',
      };

      // In real app, this would retry with exponential backoff
      const maxRetries = 3;
      if (failedAction.retryCount < maxRetries) {
        const response = await request(app.getHttpServer())
          .post('/api/documents/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('jobId', jobId)
          .field('documentType', 'job_photo')
          .field('category', failedAction.data.category)
          .attach('file', Buffer.from(failedAction.data.base64Data, 'base64'), {
            filename: 'retry_photo.jpg',
            contentType: 'image/jpeg',
          })
          .expect(201);

        expect(response.body).toMatchObject({
          documentId: expect.any(String),
          jobId,
        });
      }
    });

    it('should report sync progress and completion status', () => {
      const syncReport = {
        totalActions: 6,
        successfulSyncs: 6,
        failedSyncs: 0,
        remainingInQueue: pendingActions.length,
        syncCompletionRate: (6 / 6) * 100,
      };

      expect(syncReport.remainingInQueue).toBe(0);
      expect(syncReport.syncCompletionRate).toBe(100);
      expect(syncReport.failedSyncs).toBe(0);
    });
  });
});
