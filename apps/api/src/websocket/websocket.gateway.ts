import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { MessagesService } from '../messages/messages.service';
import { TypingService } from '../messages/typing.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  crewId?: string;
}

@WSGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3008', 'http://localhost:8081'],
    credentials: true,
  },
  namespace: '/realtime',
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('WebSocketGateway');
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds
  private crewRooms = new Map<string, Set<string>>(); // crewId -> socketIds
  private connectionTimers = new Map<string, NodeJS.Timeout>(); // socketId -> timeout
  private socketRooms = new Map<string, Set<string>>(); // socketId -> Set of room names for cleanup
  private typingTimers = new Map<string, NodeJS.Timeout>(); // socketId:threadId -> timer
  private eventRateLimiter = new Map<string, { count: number; resetTime: number }>(); // socketId -> rate limit state
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly MAX_CONNECTIONS_PER_USER = 5; // Prevent connection spam
  private readonly TYPING_TIMEOUT = 5000; // 5 seconds auto-clear typing
  private readonly EVENT_RATE_LIMIT = 100; // Max events per window
  private readonly EVENT_RATE_WINDOW = 60 * 1000; // 1 minute window

  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    @Inject(forwardRef(() => TypingService))
    private typingService: TypingService
  ) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.startHeartbeat();
  }

  /**
   * Track a room that a socket has joined for cleanup purposes
   */
  private trackRoom(socketId: string, roomName: string) {
    if (!this.socketRooms.has(socketId)) {
      this.socketRooms.set(socketId, new Set());
    }
    this.socketRooms.get(socketId)!.add(roomName);
  }

  /**
   * SECURITY: Rate limit WebSocket events to prevent flooding
   * Returns true if rate limit exceeded, false if within limits
   */
  private checkEventRateLimit(socketId: string): boolean {
    const now = Date.now();
    const limiterState = this.eventRateLimiter.get(socketId);

    if (!limiterState || now > limiterState.resetTime) {
      // Reset or initialize rate limiter
      this.eventRateLimiter.set(socketId, {
        count: 1,
        resetTime: now + this.EVENT_RATE_WINDOW
      });
      return false;
    }

    limiterState.count++;

    if (limiterState.count > this.EVENT_RATE_LIMIT) {
      this.logger.warn(
        `Event rate limit exceeded for socket ${socketId} ` +
        `(${limiterState.count}/${this.EVENT_RATE_LIMIT} in ${this.EVENT_RATE_WINDOW}ms window)`
      );
      return true;
    }

    return false;
  }

  /**
   * Clear event rate limiter for a socket
   */
  private clearEventRateLimiter(socketId: string) {
    this.eventRateLimiter.delete(socketId);
  }

  /**
   * Remove all room tracking for a socket
   */
  private clearRoomTracking(socketId: string) {
    this.socketRooms.delete(socketId);
  }

  /**
   * Clear all typing timers for a specific socket
   */
  private clearTypingTimers(socketId: string) {
    const timersToDelete: string[] = [];

    this.typingTimers.forEach((timer, key) => {
      if (key.startsWith(`${socketId}:`)) {
        clearTimeout(timer);
        timersToDelete.push(key);
      }
    });

    timersToDelete.forEach(key => this.typingTimers.delete(key));
  }

  async onModuleDestroy() {
    this.logger.log('WebSocket Gateway shutting down...');

    // Clear all timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.connectionTimers.forEach((timer) => clearTimeout(timer));
    this.connectionTimers.clear();

    // Clear all typing timers
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();

    // Disconnect all clients gracefully
    this.connectedClients.forEach((client) => {
      client.emit('serverShutdown', { message: 'Server is shutting down' });
      client.disconnect(true);
    });

    // Clear all tracking maps
    this.connectedClients.clear();
    this.userSockets.clear();
    this.crewRooms.clear();
    this.socketRooms.clear();

    this.logger.log('WebSocket Gateway shutdown complete');
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
      this.logConnectionStats();
    }, this.HEARTBEAT_INTERVAL);
  }

  private cleanupStaleConnections() {
    const staleConnections: string[] = [];

    this.connectedClients.forEach((client, socketId) => {
      if (!client.connected) {
        staleConnections.push(socketId);
      }
    });

    staleConnections.forEach((socketId) => {
      this.logger.warn(`Cleaning up stale connection: ${socketId}`);
      const client = this.connectedClients.get(socketId);
      if (client) {
        this.handleDisconnect(client);
      }
    });
  }

  private logConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      uniqueUsers: this.userSockets.size,
      activeCrews: this.crewRooms.size,
      connectionTimers: this.connectionTimers.size,
      typingTimers: this.typingTimers.size,
      trackedRooms: this.socketRooms.size
    };

    this.logger.debug('Connection stats:', stats);

    // Alert if connection count is unusually high
    if (stats.totalConnections > 1000) {
      this.logger.warn(`High connection count detected: ${stats.totalConnections}`);
    }

    // Alert if typing timers are accumulating (potential memory leak)
    if (stats.typingTimers > 100) {
      this.logger.warn(`High typing timer count detected: ${stats.typingTimers} - potential memory leak`);
    }

    // Alert if room tracking is accumulating
    if (stats.trackedRooms > stats.totalConnections * 2) {
      this.logger.warn(`Room tracking exceeds expected ratio: ${stats.trackedRooms} rooms for ${stats.totalConnections} connections`);
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    const ipAddress = client.handshake.address;
    const socketId = client.id;

    try {
      // SECURITY FIX: Authenticate FIRST before any other checks
      // This prevents unauthenticated connections from consuming resources
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No authentication token provided from IP ${ipAddress}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token and extract user info
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.logger.warn(`Connection rejected: Invalid JWT token from IP ${ipAddress} - ${errorMessage}`);
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      // Validate user exists and is active
      const user = await this.authService.findOne(payload.sub);
      if (!user || !user.isActive) {
        this.logger.warn(`Connection rejected: User ${payload.sub} not found or inactive from IP ${ipAddress}`);
        client.emit('error', { message: 'Invalid token or user deactivated' });
        client.disconnect();
        return;
      }

      // Attach authenticated user info to socket
      client.userId = user.id.toString();
      client.userRole = user.role.name;
      client.crewId = user.crewId;

      // SECURITY: Check per-user connection limit BEFORE allowing connection
      // This prevents a single user from opening unlimited connections
      if (this.userSockets.has(client.userId)) {
        const userConnections = this.userSockets.get(client.userId)!;
        if (userConnections.size >= this.MAX_CONNECTIONS_PER_USER) {
          this.logger.warn(
            `Connection rejected: User ${client.userId} exceeded connection limit ` +
            `(${userConnections.size}/${this.MAX_CONNECTIONS_PER_USER}) from IP ${ipAddress}`
          );
          client.emit('error', {
            message: 'Maximum connections per user exceeded',
            limit: this.MAX_CONNECTIONS_PER_USER,
            current: userConnections.size
          });
          client.disconnect();
          return;
        }
      }

      // SECURITY: Check per-IP connection limit as secondary defense
      // This prevents IP-based flooding attacks
      const ipConnections = Array.from(this.connectedClients.values())
        .filter(c => c.handshake.address === ipAddress).length;

      if (ipConnections >= this.MAX_CONNECTIONS_PER_USER * 2) { // Allow 2x per IP for multiple users
        this.logger.warn(
          `Connection rejected: IP ${ipAddress} exceeded connection limit ` +
          `(${ipConnections}/${this.MAX_CONNECTIONS_PER_USER * 2})`
        );
        client.emit('error', { message: 'Too many connections from this IP address' });
        client.disconnect();
        return;
      }

      // Track connected client (only after all security checks pass)
      this.connectedClients.set(socketId, client);

      // Track user sockets for per-user limits
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(socketId);

      // Set connection timeout to prevent abandoned connections
      const timeout = setTimeout(() => {
        this.logger.warn(`Connection timeout for client ${socketId} (user: ${client.userId})`);
        this.handleDisconnect(client);
        client.disconnect();
      }, this.CONNECTION_TIMEOUT);
      this.connectionTimers.set(socketId, timeout);

      // Join role-based rooms
      const roleRoom = `role:${user.role.name}`;
      await client.join(roleRoom);
      this.trackRoom(client.id, roleRoom);

      // Join crew room if applicable
      if (user.crewId) {
        const crewRoom = `crew:${user.crewId}`;
        await client.join(crewRoom);
        this.trackRoom(client.id, crewRoom);

        if (!this.crewRooms.has(user.crewId)) {
          this.crewRooms.set(user.crewId, new Set());
        }
        this.crewRooms.get(user.crewId)!.add(client.id);
      }

      // Join user-specific room
      if (client.userId) {
        const userRoom = `user:${client.userId}`;
        await client.join(userRoom);
        this.trackRoom(client.id, userRoom);
      }

      this.logger.log(`Client ${client.id} connected as ${user.username} (${user.role.name})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to SimplePro real-time service',
        userId: client.userId,
        role: client.userRole,
        timestamp: new Date().toISOString(),
      });

      // Broadcast user online status to admins/dispatchers
      this.server.to('role:admin').to('role:dispatcher').emit('userOnline', {
        userId: client.userId,
        username: user.username,
        role: user.role.name,
        crewId: user.crewId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const { userId, crewId } = client;

    this.logger.log(`Client ${client.id} disconnecting (User: ${userId})`);

    // 1. Clear connection timeout timer
    const timer = this.connectionTimers.get(client.id);
    if (timer) {
      clearTimeout(timer);
      this.connectionTimers.delete(client.id);
    }

    // 2. Clear event rate limiter for this socket
    this.clearEventRateLimiter(client.id);

    // 3. Clear all typing timers for this socket
    this.clearTypingTimers(client.id);

    // 4. Cleanup typing indicators in database
    if (userId) {
      // Fire and forget - cleanup typing indicators for this user
      this.typingService.stopTyping('*', userId).catch(err => {
        this.logger.error(`Failed to cleanup typing indicators for user ${userId}: ${err.message}`);
      });
    }

    // 5. Leave all tracked rooms explicitly
    const rooms = this.socketRooms.get(client.id);
    if (rooms && rooms.size > 0) {
      rooms.forEach(roomName => {
        try {
          client.leave(roomName);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          this.logger.warn(`Failed to leave room ${roomName}: ${errorMessage}`);
        }
      });
      this.logger.debug(`Client ${client.id} left ${rooms.size} rooms`);
    }

    // 6. Clear room tracking for this socket
    this.clearRoomTracking(client.id);

    // 7. Remove from connected clients map
    this.connectedClients.delete(client.id);

    // 8. Remove from user sockets tracking
    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    // 9. Remove from crew rooms tracking
    if (crewId) {
      const crewSocketSet = this.crewRooms.get(crewId);
      if (crewSocketSet) {
        crewSocketSet.delete(client.id);
        if (crewSocketSet.size === 0) {
          this.crewRooms.delete(crewId);
        }
      }
    }

    this.logger.log(`Client ${client.id} disconnected (User: ${userId}) - cleanup complete`);

    // 10. Broadcast user offline status if no more connections
    if (userId && !this.userSockets.has(userId)) {
      this.server.to('role:admin').to('role:dispatcher').emit('userOffline', {
        userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Job Status Updates
  @SubscribeMessage('subscribeToJob')
  async handleJobSubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { jobId: string }
  ) {
    const { jobId } = data;

    // Verify user has access to this job
    // In a real implementation, check job permissions

    const jobRoom = `job:${jobId}`;
    await client.join(jobRoom);
    this.trackRoom(client.id, jobRoom);

    this.logger.log(`Client ${client.id} subscribed to job ${jobId}`);

    client.emit('jobSubscribed', {
      jobId,
      message: 'Subscribed to job updates',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribeFromJob')
  async handleJobUnsubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { jobId: string }
  ) {
    const { jobId } = data;
    const jobRoom = `job:${jobId}`;

    await client.leave(jobRoom);

    // Remove from room tracking
    const rooms = this.socketRooms.get(client.id);
    if (rooms) {
      rooms.delete(jobRoom);
    }

    this.logger.log(`Client ${client.id} unsubscribed from job ${jobId}`);

    client.emit('jobUnsubscribed', {
      jobId,
      timestamp: new Date().toISOString(),
    });
  }

  // Location Updates from Crew
  @SubscribeMessage('locationUpdate')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      jobId?: string;
    }
  ) {
    // SECURITY: Check event rate limit
    if (this.checkEventRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    if (!client.userRole || client.userRole !== 'crew') {
      client.emit('error', { message: 'Unauthorized: Only crew can send location updates' });
      return;
    }

    const locationData = {
      userId: client.userId,
      crewId: client.crewId,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        heading: data.heading,
        speed: data.speed,
      },
      jobId: data.jobId,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to dispatchers and admins
    this.server.to('role:admin').to('role:dispatcher').emit('crewLocationUpdate', locationData);

    // If associated with a job, broadcast to job subscribers
    if (data.jobId) {
      this.server.to(`job:${data.jobId}`).emit('jobLocationUpdate', locationData);
    }

    this.logger.log(`Location update from crew ${client.userId}: ${data.latitude}, ${data.longitude}`);
  }

  // Crew Status Updates
  @SubscribeMessage('statusUpdate')
  async handleStatusUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      status: 'available' | 'busy' | 'break' | 'offline';
      message?: string;
      jobId?: string;
    }
  ) {
    if (!client.userRole || client.userRole !== 'crew') {
      client.emit('error', { message: 'Unauthorized: Only crew can send status updates' });
      return;
    }

    const statusData = {
      userId: client.userId,
      crewId: client.crewId,
      status: data.status,
      message: data.message,
      jobId: data.jobId,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to dispatchers and admins
    this.server.to('role:admin').to('role:dispatcher').emit('crewStatusUpdate', statusData);

    // Broadcast to crew room
    if (client.crewId) {
      this.server.to(`crew:${client.crewId}`).emit('teamStatusUpdate', statusData);
    }

    this.logger.log(`Status update from crew ${client.userId}: ${data.status}`);
  }

  // Chat/Communication
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      to: 'job' | 'crew' | 'user' | 'broadcast';
      targetId?: string;
      message: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ) {
    // SECURITY: Check event rate limit
    if (this.checkEventRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }
    const messageData = {
      from: {
        userId: client.userId,
        userRole: client.userRole,
      },
      to: data.to,
      targetId: data.targetId,
      message: data.message,
      priority: data.priority || 'normal',
      timestamp: new Date().toISOString(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    switch (data.to) {
      case 'job':
        if (data.targetId) {
          this.server.to(`job:${data.targetId}`).emit('newMessage', messageData);
        }
        break;
      case 'crew':
        if (data.targetId) {
          this.server.to(`crew:${data.targetId}`).emit('newMessage', messageData);
        }
        break;
      case 'user':
        if (data.targetId) {
          this.server.to(`user:${data.targetId}`).emit('newMessage', messageData);
        }
        break;
      case 'broadcast':
        if (client.userRole && (client.userRole === 'admin' || client.userRole === 'super_admin')) {
          this.server.emit('broadcast', messageData);
        } else {
          client.emit('error', { message: 'Unauthorized: Only admins can broadcast' });
        }
        break;
    }

    this.logger.log(`Message from ${client.userId} to ${data.to}:${data.targetId || 'all'}`);
  }

  // Emergency Alert
  @SubscribeMessage('emergencyAlert')
  async handleEmergencyAlert(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      type: 'accident' | 'injury' | 'property_damage' | 'security' | 'weather' | 'other';
      message: string;
      location?: {
        latitude: number;
        longitude: number;
      };
      jobId?: string;
    }
  ) {
    const alertData = {
      from: {
        userId: client.userId,
        userRole: client.userRole,
        crewId: client.crewId,
      },
      type: data.type,
      message: data.message,
      location: data.location,
      jobId: data.jobId,
      severity: 'emergency',
      timestamp: new Date().toISOString(),
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Broadcast to all admins and dispatchers immediately
    this.server.to('role:admin').to('role:dispatcher').emit('emergencyAlert', alertData);

    // If associated with a job, notify job subscribers
    if (data.jobId) {
      this.server.to(`job:${data.jobId}`).emit('jobEmergency', alertData);
    }

    // Notify crew team
    if (client.crewId) {
      this.server.to(`crew:${client.crewId}`).emit('teamEmergency', alertData);
    }

    this.logger.error(`EMERGENCY ALERT from ${client.userId}: ${data.type} - ${data.message}`);
  }

  // Public methods for external services to broadcast updates
  broadcastJobUpdate(jobId: string, update: any) {
    this.server.to(`job:${jobId}`).emit('jobUpdate', {
      jobId,
      update,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToCrew(crewId: string, event: string, data: any) {
    this.server.to(`crew:${crewId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Analytics Dashboard Subscriptions
  @SubscribeMessage('subscribeToAnalytics')
  async handleAnalyticsSubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { dashboardType?: 'overview' | 'business' | 'revenue' | 'performance' }
  ) {
    // Only allow admin and dispatcher roles to subscribe to analytics
    if (!client.userRole || !['admin', 'super_admin', 'dispatcher'].includes(client.userRole)) {
      client.emit('error', { message: 'Unauthorized: Only admins and dispatchers can access analytics' });
      return;
    }

    const baseRoom = 'analytics:subscribers';
    await client.join(baseRoom);
    this.trackRoom(client.id, baseRoom);

    if (data.dashboardType) {
      const dashboardRoom = `analytics:${data.dashboardType}`;
      await client.join(dashboardRoom);
      this.trackRoom(client.id, dashboardRoom);
    }

    this.logger.log(`Client ${client.id} subscribed to analytics updates`);

    client.emit('analyticsSubscribed', {
      message: 'Subscribed to analytics updates',
      dashboardType: data.dashboardType,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribeFromAnalytics')
  async handleAnalyticsUnsubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { dashboardType?: 'overview' | 'business' | 'revenue' | 'performance' }
  ) {
    const baseRoom = 'analytics:subscribers';
    await client.leave(baseRoom);

    const rooms = this.socketRooms.get(client.id);
    if (rooms) {
      rooms.delete(baseRoom);

      if (data.dashboardType) {
        const dashboardRoom = `analytics:${data.dashboardType}`;
        await client.leave(dashboardRoom);
        rooms.delete(dashboardRoom);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from analytics updates`);

    client.emit('analyticsUnsubscribed', {
      dashboardType: data.dashboardType,
      timestamp: new Date().toISOString(),
    });
  }

  // Analytics Broadcasting Methods
  broadcastAnalyticsUpdate(dashboardType: 'overview' | 'business' | 'revenue' | 'performance', data: any) {
    this.server.to(`analytics:${dashboardType}`).emit('analyticsUpdate', {
      dashboardType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastMetricsUpdate(metrics: any) {
    this.server.to('analytics:subscribers').emit('metricsUpdate', {
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastReportUpdate(reportId: string, status: string, progress?: number) {
    this.server.to('analytics:subscribers').emit('reportUpdate', {
      reportId,
      status,
      progress,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected users info with safety checks
  getConnectedUsers() {
    const users = Array.from(this.connectedClients.values())
      .filter(socket => socket && socket.connected) // Only include active connections
      .map(socket => ({
        socketId: socket.id,
        userId: socket.userId,
        userRole: socket.userRole,
        crewId: socket.crewId,
        connectedAt: socket.handshake.time,
        ipAddress: socket.handshake.address,
      }));
    return users;
  }

  // Memory usage monitoring
  getMemoryStats() {
    return {
      connectedClientsSize: this.connectedClients.size,
      userSocketsSize: this.userSockets.size,
      crewRoomsSize: this.crewRooms.size,
      connectionTimersSize: this.connectionTimers.size,
      typingTimersSize: this.typingTimers.size,
      socketRoomsSize: this.socketRooms.size,
      totalMappedEntries: Array.from(this.userSockets.values()).reduce((sum, set) => sum + set.size, 0) +
                          Array.from(this.crewRooms.values()).reduce((sum, set) => sum + set.size, 0),
      totalTrackedRooms: Array.from(this.socketRooms.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  // Force cleanup method for emergency situations
  forceCleanup() {
    this.logger.warn('Forcing WebSocket cleanup...');

    // Clear all timers
    this.connectionTimers.forEach((timer) => clearTimeout(timer));
    this.connectionTimers.clear();

    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();

    // Disconnect all clients
    this.connectedClients.forEach((client) => {
      if (client && client.connected) {
        client.disconnect(true);
      }
    });

    // Clear all tracking maps
    this.connectedClients.clear();
    this.userSockets.clear();
    this.crewRooms.clear();
    this.socketRooms.clear();

    this.logger.warn('WebSocket cleanup completed');
  }

  getCrewStatus() {
    const crewStatus = new Map();
    Array.from(this.connectedClients.values())
      .filter(socket => socket.userRole === 'crew')
      .forEach(socket => {
        if (socket.crewId) {
          if (!crewStatus.has(socket.crewId)) {
            crewStatus.set(socket.crewId, []);
          }
          crewStatus.get(socket.crewId).push({
            userId: socket.userId,
            socketId: socket.id,
          });
        }
      });
    return Object.fromEntries(crewStatus);
  }

  // ==================== Message Event Handlers ====================

  @SubscribeMessage('message.send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: {
      threadId: string;
      content: string;
      messageType?: string;
      attachments?: any[];
      location?: any;
      replyToId?: string;
    }
  ) {
    // SECURITY: Check event rate limit
    if (this.checkEventRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    try {
      const message = await this.messagesService.sendMessage(
        {
          threadId: payload.threadId,
          content: payload.content,
          messageType: payload.messageType,
          attachments: payload.attachments,
          location: payload.location,
          replyToId: payload.replyToId,
        },
        client.userId!
      );

      // Get thread to find all participants
      const thread = await this.messagesService.getThreadById(payload.threadId);

      // Emit to all thread participants
      thread.participants.forEach((participant: any) => {
        const participantId = participant._id?.toString() || participant.toString();
        this.server.to(`user:${participantId}`).emit('message.created', {
          message,
          threadId: payload.threadId,
          timestamp: new Date().toISOString(),
        });
      });

      this.logger.log(`Message sent in thread ${payload.threadId} by user ${client.userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to send message: ${errorMessage}`);
      client.emit('error', { message: 'Failed to send message', error: error.message });
    }
  }

  @SubscribeMessage('typing.start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string }
  ) {
    try {
      await this.typingService.startTyping(payload.threadId, client.userId!);

      // Clear any existing typing timer for this socket/thread combination
      const timerKey = `${client.id}:${payload.threadId}`;
      const existingTimer = this.typingTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set auto-clear timer (5 seconds)
      const timer = setTimeout(() => {
        this.handleTypingStop(client, payload).catch(err => {
          this.logger.error(`Failed to auto-clear typing: ${err.message}`);
        });
        this.typingTimers.delete(timerKey);
      }, this.TYPING_TIMEOUT);

      this.typingTimers.set(timerKey, timer);

      // Get thread to find other participants
      const thread = await this.messagesService.getThreadById(payload.threadId);

      // Emit to other thread participants (not the sender)
      thread.participants.forEach((participant: any) => {
        const participantId = participant._id?.toString() || participant.toString();
        if (participantId !== client.userId) {
          this.server.to(`user:${participantId}`).emit('user.typing', {
            threadId: payload.threadId,
            userId: client.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      this.logger.debug(`User ${client.userId} started typing in thread ${payload.threadId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to handle typing start: ${errorMessage}`);
    }
  }

  @SubscribeMessage('typing.stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string }
  ) {
    try {
      // Clear the typing timer
      const timerKey = `${client.id}:${payload.threadId}`;
      const timer = this.typingTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.typingTimers.delete(timerKey);
      }

      await this.typingService.stopTyping(payload.threadId, client.userId!);

      // Get thread to find other participants
      const thread = await this.messagesService.getThreadById(payload.threadId);

      // Emit to other thread participants (not the sender)
      thread.participants.forEach((participant: any) => {
        const participantId = participant._id?.toString() || participant.toString();
        if (participantId !== client.userId) {
          this.server.to(`user:${participantId}`).emit('user.stopped_typing', {
            threadId: payload.threadId,
            userId: client.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      this.logger.debug(`User ${client.userId} stopped typing in thread ${payload.threadId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to handle typing stop: ${errorMessage}`);
    }
  }

  @SubscribeMessage('message.read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string; messageId: string }
  ) {
    try {
      await this.messagesService.markAsRead(payload.threadId, client.userId!, payload.messageId);

      // Get the message to find the sender
      const message = await this.messagesService.getMessageById(payload.messageId);

      // Emit read receipt to sender
      const senderId = message.senderId.toString();
      this.server.to(`user:${senderId}`).emit('message.read_receipt', {
        messageId: payload.messageId,
        threadId: payload.threadId,
        readBy: client.userId,
        readAt: new Date().toISOString(),
      });

      this.logger.debug(`Message ${payload.messageId} marked as read by ${client.userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to handle message read: ${errorMessage}`);
    }
  }

  @SubscribeMessage('message.edit')
  async handleMessageEdit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; content: string }
  ) {
    try {
      const updatedMessage = await this.messagesService.editMessage(
        payload.messageId,
        payload.content,
        client.userId!
      );

      // Get thread to find all participants
      const thread = await this.messagesService.getThreadById(updatedMessage.threadId.toString());

      // Emit to all thread participants
      thread.participants.forEach((participant: any) => {
        const participantId = participant._id?.toString() || participant.toString();
        this.server.to(`user:${participantId}`).emit('message.edited', {
          message: updatedMessage,
          timestamp: new Date().toISOString(),
        });
      });

      this.logger.log(`Message ${payload.messageId} edited by user ${client.userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to edit message: ${errorMessage}`);
      client.emit('error', { message: 'Failed to edit message', error: error.message });
    }
  }

  @SubscribeMessage('message.delete')
  async handleMessageDelete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; threadId: string }
  ) {
    try {
      await this.messagesService.deleteMessage(payload.messageId, client.userId!);

      // Get thread to find all participants
      const thread = await this.messagesService.getThreadById(payload.threadId);

      // Emit to all thread participants
      thread.participants.forEach((participant: any) => {
        const participantId = participant._id?.toString() || participant.toString();
        this.server.to(`user:${participantId}`).emit('message.deleted', {
          messageId: payload.messageId,
          threadId: payload.threadId,
          timestamp: new Date().toISOString(),
        });
      });

      this.logger.log(`Message ${payload.messageId} deleted by user ${client.userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to delete message: ${errorMessage}`);
      client.emit('error', { message: 'Failed to delete message', error: error.message });
    }
  }

  @SubscribeMessage('thread.subscribe')
  async handleThreadSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string }
  ) {
    try {
      // Verify user has access to this thread
      const thread = await this.messagesService.getThreadById(payload.threadId);

      const hasAccess = thread.participants.some((participant: any) => {
        const participantId = participant._id?.toString() || participant.toString();
        return participantId === client.userId;
      });

      if (!hasAccess) {
        client.emit('error', { message: 'You do not have access to this thread' });
        return;
      }

      const threadRoom = `thread:${payload.threadId}`;
      await client.join(threadRoom);
      this.trackRoom(client.id, threadRoom);

      client.emit('thread.subscribed', {
        threadId: payload.threadId,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Client ${client.id} subscribed to thread ${payload.threadId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to subscribe to thread: ${errorMessage}`);
      client.emit('error', { message: 'Failed to subscribe to thread', error: error.message });
    }
  }

  @SubscribeMessage('thread.unsubscribe')
  async handleThreadUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string }
  ) {
    try {
      const threadRoom = `thread:${payload.threadId}`;
      await client.leave(threadRoom);

      // Remove from room tracking
      const rooms = this.socketRooms.get(client.id);
      if (rooms) {
        rooms.delete(threadRoom);
      }

      client.emit('thread.unsubscribed', {
        threadId: payload.threadId,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Client ${client.id} unsubscribed from thread ${payload.threadId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to unsubscribe from thread: ${errorMessage}`);
    }
  }

  // Public method for broadcasting message updates from external services
  broadcastMessageUpdate(threadId: string, event: string, data: any) {
    this.server.to(`thread:${threadId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}