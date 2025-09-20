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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';

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
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('WebSocketGateway');
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds
  private crewRooms = new Map<string, Set<string>>(); // crewId -> socketIds

  constructor(
    private jwtService: JwtService,
    private authService: AuthService
  ) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.authService.findOne(payload.sub);

      if (!user || !user.isActive) {
        this.logger.warn(`Invalid user for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = user.id.toString();
      client.userRole = user.role.name;
      client.crewId = user.crewId;

      // Track connected clients
      this.connectedClients.set(client.id, client);

      // Track user sockets
      if (client.userId && !this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      if (client.userId) {
        this.userSockets.get(client.userId)!.add(client.id);
      }

      // Join role-based rooms
      await client.join(`role:${user.role.name}`);

      // Join crew room if applicable
      if (user.crewId) {
        await client.join(`crew:${user.crewId}`);
        if (!this.crewRooms.has(user.crewId)) {
          this.crewRooms.set(user.crewId, new Set());
        }
        this.crewRooms.get(user.crewId)!.add(client.id);
      }

      // Join user-specific room
      if (client.userId) {
        await client.join(`user:${client.userId}`);
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

    // Remove from tracking maps
    this.connectedClients.delete(client.id);

    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    if (crewId) {
      const crewSocketSet = this.crewRooms.get(crewId);
      if (crewSocketSet) {
        crewSocketSet.delete(client.id);
        if (crewSocketSet.size === 0) {
          this.crewRooms.delete(crewId);
        }
      }
    }

    this.logger.log(`Client ${client.id} disconnected (User: ${userId})`);

    // Broadcast user offline status if no more connections
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

    await client.join(`job:${jobId}`);
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
    await client.leave(`job:${jobId}`);
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
    if (client.userRole !== 'crew') {
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
    if (client.userRole !== 'crew') {
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
        if (client.userRole === 'admin' || client.userRole === 'super_admin') {
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
    if (!['admin', 'super_admin', 'dispatcher'].includes(client.userRole)) {
      client.emit('error', { message: 'Unauthorized: Only admins and dispatchers can access analytics' });
      return;
    }

    await client.join('analytics:subscribers');

    if (data.dashboardType) {
      await client.join(`analytics:${data.dashboardType}`);
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
    await client.leave('analytics:subscribers');

    if (data.dashboardType) {
      await client.leave(`analytics:${data.dashboardType}`);
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

  // Get connected users info
  getConnectedUsers() {
    const users = Array.from(this.connectedClients.values()).map(socket => ({
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole,
      crewId: socket.crewId,
      connectedAt: socket.handshake.time,
    }));
    return users;
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
}