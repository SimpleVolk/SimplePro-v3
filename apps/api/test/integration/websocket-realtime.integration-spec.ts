import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { io, Socket } from 'socket.io-client';

describe('WebSocket Real-time Updates & Messaging (Integration)', () => {
  let app: INestApplication;
  let dispatcherToken: string;
  let crewToken: string;
  let dispatcherUserId: string;
  let crewUserId: string;
  let jobId: string;
  let dispatcherSocket: Socket;
  let crewSocket: Socket;
  let serverUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0); // Random available port

    const address = app.getHttpServer().address();
    serverUrl = `http://localhost:${address.port}`;

    // Create dispatcher user
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Admin123!',
      })
      .expect(200);

    const adminToken = adminLoginResponse.body.accessToken;

    const dispatcherResponse = await request(app.getHttpServer())
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'dispatcher001',
        email: 'dispatcher@simplepro.com',
        password: 'Dispatcher123!',
        role: 'dispatcher',
        firstName: 'Sarah',
        lastName: 'Dispatcher',
      })
      .expect(201);

    dispatcherUserId = dispatcherResponse.body.userId;

    const dispatcherLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'dispatcher001',
        password: 'Dispatcher123!',
      })
      .expect(200);

    dispatcherToken = dispatcherLogin.body.accessToken;

    // Create crew user
    const crewResponse = await request(app.getHttpServer())
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'crewmember002',
        email: 'crew002@simplepro.com',
        password: 'Crew123!',
        role: 'crew',
        firstName: 'Tom',
        lastName: 'Crew',
      })
      .expect(201);

    crewUserId = crewResponse.body.userId;

    const crewLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'crewmember002',
        password: 'Crew123!',
      })
      .expect(200);

    crewToken = crewLogin.body.accessToken;

    // Create a job for testing
    const jobResponse = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        customerId: 'test-customer-ws',
        serviceType: 'local',
        status: 'scheduled',
        scheduledDate: new Date().toISOString(),
        estimatedCrewSize: 2,
      })
      .expect(201);

    jobId = jobResponse.body.jobId;
  });

  afterAll(async () => {
    if (dispatcherSocket && dispatcherSocket.connected) {
      dispatcherSocket.disconnect();
    }
    if (crewSocket && crewSocket.connected) {
      crewSocket.disconnect();
    }
    await app.close();
  });

  describe('Multi-channel Notification Delivery', () => {
    it('should create notification and deliver via in-app channel', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          recipientId: crewUserId,
          type: 'job_assigned',
          title: 'New Job Assignment',
          message: `You have been assigned to job ${jobId}`,
          jobId,
          channels: ['in_app'],
          priority: 'high',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        notificationId: expect.any(String),
        recipientId: crewUserId,
        type: 'job_assigned',
        channels: ['in_app'],
        deliveryStatus: expect.objectContaining({
          in_app: 'delivered',
        }),
      });
    });

    it('should retrieve unread notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);

      expect(response.body.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'job_assigned',
            jobId,
            isRead: false,
          }),
        ])
      );
      expect(response.body.unreadCount).toBeGreaterThan(0);
    });

    it('should send notification via multiple channels (in-app, email, sms, push)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          recipientId: crewUserId,
          type: 'job_updated',
          title: 'Job Time Changed',
          message: 'Your job schedule has been updated',
          jobId,
          channels: ['in_app', 'email', 'sms', 'push'],
          priority: 'medium',
        })
        .expect(201);

      expect(response.body.channels).toEqual(
        expect.arrayContaining(['in_app', 'email', 'sms', 'push'])
      );

      // In test environment with mocks, these would show 'sent' status
      expect(response.body.deliveryStatus).toMatchObject({
        in_app: 'delivered',
        email: expect.stringMatching(/^(sent|delivered)$/),
        sms: expect.stringMatching(/^(sent|delivered)$/),
        push: expect.stringMatching(/^(sent|delivered)$/),
      });
    });

    it('should mark notification as read', async () => {
      // Get first notification
      const listResponse = await request(app.getHttpServer())
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);

      const notificationId = listResponse.body.notifications[0].notificationId;

      const response = await request(app.getHttpServer())
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        notificationId,
        isRead: true,
        readAt: expect.any(String),
      });
    });
  });

  describe('WebSocket Real-time Events', () => {
    it('should establish WebSocket connection with JWT authentication', (done) => {
      crewSocket = io(serverUrl, {
        auth: {
          token: crewToken,
        },
        transports: ['websocket'],
      });

      crewSocket.on('connect', () => {
        expect(crewSocket.connected).toBe(true);
        expect(crewSocket.id).toBeDefined();
        done();
      });

      crewSocket.on('connect_error', (error) => {
        done(error);
      });
    }, 10000);

    it('should subscribe to job updates', (done) => {
      crewSocket.emit('subscribe.job', jobId);

      crewSocket.on('job.subscribed', (data) => {
        expect(data).toMatchObject({
          jobId,
          status: 'subscribed',
        });
        done();
      });
    }, 10000);

    it('should receive real-time job status update via WebSocket', (done) => {
      crewSocket.on('job.updated', (data) => {
        expect(data).toMatchObject({
          jobId,
          status: 'in_progress',
          updatedBy: dispatcherUserId,
        });
        done();
      });

      // Dispatcher updates job status
      request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ status: 'in_progress' })
        .then((response) => {
          expect(response.status).toBe(200);
        });
    }, 10000);

    it('should receive new notification event via WebSocket', (done) => {
      crewSocket.on('notification.new', (data) => {
        expect(data).toMatchObject({
          notificationId: expect.any(String),
          type: 'job_reminder',
          title: expect.any(String),
          message: expect.any(String),
        });
        done();
      });

      // Send notification
      request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          recipientId: crewUserId,
          type: 'job_reminder',
          title: 'Job Starting Soon',
          message: 'Your job starts in 30 minutes',
          jobId,
          channels: ['in_app'],
        })
        .then((response) => {
          expect(response.status).toBe(201);
        });
    }, 10000);

    it('should receive read receipt via WebSocket', (done) => {
      dispatcherSocket = io(serverUrl, {
        auth: {
          token: dispatcherToken,
        },
        transports: ['websocket'],
      });

      dispatcherSocket.on('connect', () => {
        dispatcherSocket.on('notification.read', (data) => {
          expect(data).toMatchObject({
            notificationId: expect.any(String),
            readBy: crewUserId,
            readAt: expect.any(String),
          });
          done();
        });

        // Crew marks notification as read
        request(app.getHttpServer())
          .get('/api/notifications')
          .set('Authorization', `Bearer ${crewToken}`)
          .then((listRes) => {
            const notificationId = listRes.body.notifications[0].notificationId;

            return request(app.getHttpServer())
              .patch(`/api/notifications/${notificationId}/read`)
              .set('Authorization', `Bearer ${crewToken}`);
          });
      });
    }, 15000);
  });

  describe('Real-time Messaging', () => {
    let conversationId: string;

    it('should create a conversation between dispatcher and crew', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          participants: [dispatcherUserId, crewUserId],
          jobId,
          type: 'job_chat',
        })
        .expect(201);

      conversationId = response.body.conversationId;

      expect(response.body).toMatchObject({
        conversationId: expect.any(String),
        participants: expect.arrayContaining([dispatcherUserId, crewUserId]),
        jobId,
        type: 'job_chat',
      });
    });

    it('should subscribe to conversation updates', (done) => {
      crewSocket.emit('subscribe.conversation', conversationId);

      crewSocket.on('conversation.subscribed', (data) => {
        expect(data).toMatchObject({
          conversationId,
          status: 'subscribed',
        });
        done();
      });
    }, 10000);

    it('should send message and receive via WebSocket', (done) => {
      crewSocket.on('message.new', (data) => {
        expect(data).toMatchObject({
          conversationId,
          senderId: dispatcherUserId,
          message: 'The job address has changed. New address: 789 Pine St',
          messageType: 'text',
        });
        done();
      });

      // Dispatcher sends message
      request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          message: 'The job address has changed. New address: 789 Pine St',
          messageType: 'text',
        })
        .then((response) => {
          expect(response.status).toBe(201);
        });
    }, 10000);

    it('should show typing indicator', (done) => {
      dispatcherSocket.on('typing.start', (data) => {
        expect(data).toMatchObject({
          conversationId,
          userId: crewUserId,
          userName: 'Tom Crew',
        });
        done();
      });

      // Crew starts typing
      crewSocket.emit('typing.start', {
        conversationId,
        userId: crewUserId,
      });
    }, 10000);

    it('should send message with typing indicator stop', (done) => {
      dispatcherSocket.on('typing.stop', (data) => {
        expect(data).toMatchObject({
          conversationId,
          userId: crewUserId,
        });
        done();
      });

      // Crew sends message (stops typing)
      request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${crewToken}`)
        .send({
          message: 'Understood. I will update my GPS to the new address.',
          messageType: 'text',
        })
        .then((response) => {
          expect(response.status).toBe(201);
          crewSocket.emit('typing.stop', {
            conversationId,
            userId: crewUserId,
          });
        });
    }, 10000);

    it('should update unread count in real-time', (done) => {
      dispatcherSocket.on('conversation.unread_updated', (data) => {
        expect(data).toMatchObject({
          conversationId,
          unreadCount: expect.any(Number),
        });
        expect(data.unreadCount).toBeGreaterThan(0);
        done();
      });

      // Crew sends another message
      request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${crewToken}`)
        .send({
          message: 'Should I bring extra packing materials?',
          messageType: 'text',
        })
        .then((response) => {
          expect(response.status).toBe(201);
        });
    }, 10000);

    it('should mark messages as read and update count', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/messages/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        conversationId,
        unreadCount: 0,
        markedAsReadBy: dispatcherUserId,
      });
    });

    it('should retrieve conversation history with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}/messages?limit=10&offset=0`)
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);

      expect(response.body.messages).toBeDefined();
      expect(response.body.messages.length).toBeGreaterThan(0);
      expect(response.body.messages[0]).toMatchObject({
        messageId: expect.any(String),
        senderId: expect.any(String),
        message: expect.any(String),
        messageType: 'text',
        timestamp: expect.any(String),
      });
    });

    it('should handle WebSocket disconnect and reconnect', (done) => {
      crewSocket.disconnect();

      setTimeout(() => {
        crewSocket.connect();

        crewSocket.on('connect', () => {
          expect(crewSocket.connected).toBe(true);

          // Re-subscribe after reconnect
          crewSocket.emit('subscribe.conversation', conversationId);

          crewSocket.on('conversation.subscribed', () => {
            done();
          });
        });
      }, 1000);
    }, 15000);
  });

  describe('WebSocket Performance & Reliability', () => {
    it('should handle multiple simultaneous subscriptions', (done) => {
      const job2Id = 'test-job-2';
      const job3Id = 'test-job-3';

      let subscriptionsCount = 0;

      crewSocket.on('job.subscribed', () => {
        subscriptionsCount++;
        if (subscriptionsCount === 3) {
          expect(subscriptionsCount).toBe(3);
          done();
        }
      });

      crewSocket.emit('subscribe.job', jobId);
      crewSocket.emit('subscribe.job', job2Id);
      crewSocket.emit('subscribe.job', job3Id);
    }, 10000);

    it('should handle rapid message sending without loss', async () => {
      const messageCount = 10;
      const messages: string[] = [];

      for (let i = 0; i < messageCount; i++) {
        const response = await request(app.getHttpServer())
          .post(`/api/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${dispatcherToken}`)
          .send({
            message: `Rapid message ${i + 1}`,
            messageType: 'text',
          })
          .expect(201);

        messages.push(response.body.messageId);
      }

      expect(messages.length).toBe(messageCount);

      // Verify all messages in history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}/messages?limit=20`)
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);

      const rapidMessages = historyResponse.body.messages.filter((m: any) =>
        m.message.startsWith('Rapid message')
      );

      expect(rapidMessages.length).toBe(messageCount);
    });
  });
});
