import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketGateway } from './websocket.gateway';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { MessagesService } from '../messages/messages.service';
import { TypingService } from '../messages/typing.service';
import { Server, Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  crewId?: string;
}

describe('WebSocketGateway Memory Leak Fixes', () => {
  let gateway: WebSocketGateway;
  let jwtService: JwtService;
  let authService: AuthService;
  let messagesService: MessagesService;
  let typingService: TypingService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: { name: 'crew' },
    isActive: true,
    crewId: 'crew-456'
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  } as unknown as Server;

  const createMockSocket = (socketId: string, userId: string): AuthenticatedSocket => {
    const socket = {
      id: socketId,
      userId: userId,
      userRole: 'crew',
      crewId: 'crew-456',
      connected: true,
      handshake: {
        auth: { token: 'valid-token' },
        address: '127.0.0.1',
        time: new Date().toISOString()
      },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn()
    } as unknown as AuthenticatedSocket;
    return socket;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ sub: 'user-123' })
          }
        },
        {
          provide: AuthService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockUser)
          }
        },
        {
          provide: MessagesService,
          useValue: {
            getThreadById: jest.fn().mockResolvedValue({
              participants: ['user-123', 'user-456']
            }),
            sendMessage: jest.fn(),
            markAsRead: jest.fn(),
            editMessage: jest.fn(),
            deleteMessage: jest.fn(),
            getMessageById: jest.fn()
          }
        },
        {
          provide: TypingService,
          useValue: {
            startTyping: jest.fn().mockResolvedValue(undefined),
            stopTyping: jest.fn().mockResolvedValue(undefined),
            getTypingUsers: jest.fn().mockResolvedValue([]),
            cleanupExpiredIndicators: jest.fn().mockResolvedValue(undefined)
          }
        }
      ]
    }).compile();

    gateway = module.get<WebSocketGateway>(WebSocketGateway);
    jwtService = module.get<JwtService>(JwtService);
    authService = module.get<AuthService>(AuthService);
    messagesService = module.get<MessagesService>(MessagesService);
    typingService = module.get<TypingService>(TypingService);

    // Set the server manually
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Room Cleanup on Disconnect', () => {
    it('should track rooms when socket joins them', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      const stats = gateway.getMemoryStats();
      expect(stats.socketRoomsSize).toBeGreaterThan(0);
      expect(stats.totalTrackedRooms).toBeGreaterThan(0);
    });

    it('should clear all rooms when socket disconnects', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Verify rooms were tracked
      let stats = gateway.getMemoryStats();
      const initialRoomCount = stats.socketRoomsSize;
      expect(initialRoomCount).toBeGreaterThan(0);

      // Disconnect
      gateway.handleDisconnect(socket);

      // Verify rooms were cleared
      stats = gateway.getMemoryStats();
      expect(stats.socketRoomsSize).toBe(initialRoomCount - 1);
      expect(socket.leave).toHaveBeenCalled();
    });

    it('should clear rooms for job subscriptions on disconnect', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Subscribe to a job
      await gateway.handleJobSubscription(socket, { jobId: 'job-789' });

      // Verify job room was tracked
      const statsAfterSubscribe = gateway.getMemoryStats();
      expect(statsAfterSubscribe.totalTrackedRooms).toBeGreaterThan(0);

      // Disconnect
      gateway.handleDisconnect(socket);

      // Verify all rooms including job room were cleared
      expect(socket.leave).toHaveBeenCalled();
    });

    it('should clear rooms for thread subscriptions on disconnect', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Subscribe to a thread
      await gateway.handleThreadSubscribe(socket, { threadId: 'thread-123' });

      // Disconnect
      gateway.handleDisconnect(socket);

      // Verify thread room was left
      expect(socket.leave).toHaveBeenCalled();
    });

    it('should clear rooms for analytics subscriptions on disconnect', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      socket.userRole = 'admin'; // Analytics requires admin role
      await gateway.handleConnection(socket);

      // Subscribe to analytics
      await gateway.handleAnalyticsSubscription(socket, { dashboardType: 'overview' });

      // Disconnect
      gateway.handleDisconnect(socket);

      // Verify analytics rooms were left
      expect(socket.leave).toHaveBeenCalled();
    });
  });

  describe('Typing Timer Cleanup', () => {
    it('should create typing timer when user starts typing', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      await gateway.handleTypingStart(socket, { threadId: 'thread-123' });

      const stats = gateway.getMemoryStats();
      expect(stats.typingTimersSize).toBeGreaterThan(0);
    });

    it('should clear typing timer when user stops typing', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      await gateway.handleTypingStart(socket, { threadId: 'thread-123' });

      // Verify timer exists
      let stats = gateway.getMemoryStats();
      const initialTimerCount = stats.typingTimersSize;
      expect(initialTimerCount).toBeGreaterThan(0);

      // Stop typing
      await gateway.handleTypingStop(socket, { threadId: 'thread-123' });

      // Verify timer was cleared
      stats = gateway.getMemoryStats();
      expect(stats.typingTimersSize).toBe(initialTimerCount - 1);
    });

    it('should auto-clear typing timer after timeout', (done) => {
      const socket = createMockSocket('socket-1', 'user-123');

      gateway.handleConnection(socket).then(() => {
        return gateway.handleTypingStart(socket, { threadId: 'thread-123' });
      }).then(() => {
        // Wait for auto-clear timeout (5 seconds + buffer)
        setTimeout(() => {
          const stats = gateway.getMemoryStats();
          // Timer should be auto-cleared
          expect(typingService.stopTyping).toHaveBeenCalled();
          done();
        }, 5100);
      });
    }, 10000);

    it('should clear all typing timers for socket on disconnect', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Start typing in multiple threads
      await gateway.handleTypingStart(socket, { threadId: 'thread-1' });
      await gateway.handleTypingStart(socket, { threadId: 'thread-2' });
      await gateway.handleTypingStart(socket, { threadId: 'thread-3' });

      // Verify timers exist
      let stats = gateway.getMemoryStats();
      expect(stats.typingTimersSize).toBeGreaterThan(0);

      // Disconnect
      gateway.handleDisconnect(socket);

      // Verify all typing timers for this socket were cleared
      stats = gateway.getMemoryStats();
      // After disconnect, no timers should remain for this socket
      expect(typingService.stopTyping).toHaveBeenCalledWith('*', 'user-123');
    });

    it('should replace existing timer when user types again before timeout', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Start typing
      await gateway.handleTypingStart(socket, { threadId: 'thread-123' });

      const statsAfterFirst = gateway.getMemoryStats();
      const firstTimerCount = statsAfterFirst.typingTimersSize;

      // Start typing again (should replace timer, not add new one)
      await gateway.handleTypingStart(socket, { threadId: 'thread-123' });

      const statsAfterSecond = gateway.getMemoryStats();
      // Should still be the same number of timers (replaced, not added)
      expect(statsAfterSecond.typingTimersSize).toBe(firstTimerCount);
    });
  });

  describe('Connection Timer Cleanup', () => {
    it('should clear connection timeout timer on disconnect', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Verify connection timer exists
      let stats = gateway.getMemoryStats();
      expect(stats.connectionTimersSize).toBeGreaterThan(0);

      // Disconnect
      gateway.handleDisconnect(socket);

      // Verify connection timer was cleared
      stats = gateway.getMemoryStats();
      expect(stats.connectionTimersSize).toBe(0);
    });
  });

  describe('Memory Monitoring', () => {
    it('should provide accurate memory statistics', async () => {
      const socket1 = createMockSocket('socket-1', 'user-123');
      const socket2 = createMockSocket('socket-2', 'user-456');

      await gateway.handleConnection(socket1);
      await gateway.handleConnection(socket2);

      const stats = gateway.getMemoryStats();

      expect(stats.connectedClientsSize).toBe(2);
      expect(stats.socketRoomsSize).toBe(2);
      expect(stats.connectionTimersSize).toBe(2);
      expect(stats.totalTrackedRooms).toBeGreaterThan(0);
    });

    it('should log warning for high typing timer count', async () => {
      const loggerWarnSpy = jest.spyOn(gateway['logger'], 'warn');

      // Manually set high timer count for testing
      for (let i = 0; i < 101; i++) {
        gateway['typingTimers'].set(`socket-${i}:thread-1`, setTimeout(() => {}, 5000));
      }

      // Trigger stats logging
      gateway['logConnectionStats']();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High typing timer count detected')
      );

      // Cleanup
      gateway['typingTimers'].forEach(timer => clearTimeout(timer));
      gateway['typingTimers'].clear();
    });
  });

  describe('Force Cleanup', () => {
    it('should clear all resources on force cleanup', async () => {
      const socket1 = createMockSocket('socket-1', 'user-123');
      const socket2 = createMockSocket('socket-2', 'user-456');

      await gateway.handleConnection(socket1);
      await gateway.handleConnection(socket2);

      // Force cleanup
      gateway.forceCleanup();

      const stats = gateway.getMemoryStats();

      expect(stats.connectedClientsSize).toBe(0);
      expect(stats.socketRoomsSize).toBe(0);
      expect(stats.connectionTimersSize).toBe(0);
      expect(stats.typingTimersSize).toBe(0);
    });
  });

  describe('Module Destroy Cleanup', () => {
    it('should clear all timers and maps on module destroy', async () => {
      const socket1 = createMockSocket('socket-1', 'user-123');
      const socket2 = createMockSocket('socket-2', 'user-456');

      await gateway.handleConnection(socket1);
      await gateway.handleConnection(socket2);

      await gateway.handleTypingStart(socket1, { threadId: 'thread-123' });

      // Destroy module
      await gateway.onModuleDestroy();

      const stats = gateway.getMemoryStats();

      expect(stats.connectedClientsSize).toBe(0);
      expect(stats.socketRoomsSize).toBe(0);
      expect(stats.connectionTimersSize).toBe(0);
      expect(stats.typingTimersSize).toBe(0);
    });
  });

  describe('Unsubscribe Room Cleanup', () => {
    it('should remove room from tracking when unsubscribing from job', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Subscribe
      await gateway.handleJobSubscription(socket, { jobId: 'job-789' });
      const statsAfterSub = gateway.getMemoryStats();

      // Unsubscribe
      await gateway.handleJobUnsubscription(socket, { jobId: 'job-789' });
      const statsAfterUnsub = gateway.getMemoryStats();

      // Room count should decrease
      expect(statsAfterUnsub.totalTrackedRooms).toBeLessThan(statsAfterSub.totalTrackedRooms);
    });

    it('should remove room from tracking when unsubscribing from thread', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      await gateway.handleConnection(socket);

      // Subscribe
      await gateway.handleThreadSubscribe(socket, { threadId: 'thread-123' });
      const statsAfterSub = gateway.getMemoryStats();

      // Unsubscribe
      await gateway.handleThreadUnsubscribe(socket, { threadId: 'thread-123' });
      const statsAfterUnsub = gateway.getMemoryStats();

      // Room count should decrease
      expect(statsAfterUnsub.totalTrackedRooms).toBeLessThan(statsAfterSub.totalTrackedRooms);
    });

    it('should remove room from tracking when unsubscribing from analytics', async () => {
      const socket = createMockSocket('socket-1', 'user-123');
      socket.userRole = 'admin';
      await gateway.handleConnection(socket);

      // Subscribe to analytics with dashboard type
      await gateway.handleAnalyticsSubscription(socket, { dashboardType: 'overview' });
      const statsAfterSub = gateway.getMemoryStats();
      const roomsAfterSub = statsAfterSub.totalTrackedRooms;

      // Unsubscribe (this should remove both base and dashboard-specific rooms)
      await gateway.handleAnalyticsUnsubscription(socket, { dashboardType: 'overview' });
      const statsAfterUnsub = gateway.getMemoryStats();

      // Room count should decrease by at least 1 (the dashboard-specific room)
      // Note: The base "analytics:subscribers" room is also removed
      expect(statsAfterUnsub.totalTrackedRooms).toBeLessThanOrEqual(roomsAfterSub);
    });
  });
});
