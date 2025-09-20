import { Injectable } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';

export interface JobUpdateData {
  jobId: string;
  status?: string;
  progress?: number;
  message?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  estimatedCompletion?: string;
  crewUpdate?: {
    userId: string;
    action: string;
    timestamp: string;
  };
}

export interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  persistent?: boolean;
  actionUrl?: string;
  actionText?: string;
}

@Injectable()
export class RealtimeService {
  constructor(private webSocketGateway: WebSocketGateway) {}

  // Job-related real-time updates
  notifyJobStatusChange(jobId: string, newStatus: string, updatedBy: string) {
    const updateData: JobUpdateData = {
      jobId,
      status: newStatus,
      message: `Job status changed to ${newStatus}`,
      crewUpdate: {
        userId: updatedBy,
        action: 'status_change',
        timestamp: new Date().toISOString(),
      },
    };

    this.webSocketGateway.broadcastJobUpdate(jobId, updateData);
    this.webSocketGateway.broadcastToRole('admin', 'jobStatusChanged', updateData);
    this.webSocketGateway.broadcastToRole('dispatcher', 'jobStatusChanged', updateData);
  }

  notifyJobProgress(jobId: string, progress: number, message: string, crewId?: string) {
    const updateData: JobUpdateData = {
      jobId,
      progress,
      message,
    };

    this.webSocketGateway.broadcastJobUpdate(jobId, updateData);

    if (crewId) {
      this.webSocketGateway.broadcastToCrew(crewId, 'jobProgress', updateData);
    }
  }

  notifyJobAssignment(jobId: string, crewId: string, assignedBy: string) {
    const updateData: JobUpdateData = {
      jobId,
      message: 'Job has been assigned to your crew',
      crewUpdate: {
        userId: assignedBy,
        action: 'job_assigned',
        timestamp: new Date().toISOString(),
      },
    };

    this.webSocketGateway.broadcastToCrew(crewId, 'jobAssigned', updateData);
    this.webSocketGateway.broadcastJobUpdate(jobId, updateData);
  }

  notifyJobCompletion(jobId: string, _crewId: string, completedBy: string) {
    const updateData: JobUpdateData = {
      jobId,
      status: 'completed',
      message: 'Job has been completed',
      crewUpdate: {
        userId: completedBy,
        action: 'job_completed',
        timestamp: new Date().toISOString(),
      },
    };

    this.webSocketGateway.broadcastJobUpdate(jobId, updateData);
    this.webSocketGateway.broadcastToRole('admin', 'jobCompleted', updateData);
    this.webSocketGateway.broadcastToRole('dispatcher', 'jobCompleted', updateData);
  }

  // User notifications
  sendNotificationToUser(userId: string, notification: NotificationData) {
    this.webSocketGateway.broadcastToUser(userId, 'notification', notification);
  }

  sendNotificationToCrew(crewId: string, notification: NotificationData) {
    this.webSocketGateway.broadcastToCrew(crewId, 'notification', notification);
  }

  sendNotificationToRole(role: string, notification: NotificationData) {
    this.webSocketGateway.broadcastToRole(role, 'notification', notification);
  }

  broadcastSystemNotification(notification: NotificationData) {
    this.webSocketGateway.broadcastToRole('admin', 'systemNotification', notification);
    this.webSocketGateway.broadcastToRole('dispatcher', 'systemNotification', notification);
  }

  // Customer-related updates
  notifyCustomerUpdate(customerId: string, updateType: string, data: any) {
    this.webSocketGateway.broadcastToRole('admin', 'customerUpdate', {
      customerId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    });
    this.webSocketGateway.broadcastToRole('dispatcher', 'customerUpdate', {
      customerId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Estimate-related updates
  notifyEstimateCalculated(customerId: string, estimateId: string, totalPrice: number, calculatedBy: string) {
    const notification: NotificationData = {
      id: `estimate_${estimateId}`,
      type: 'success',
      title: 'New Estimate Calculated',
      message: `Estimate of $${totalPrice.toLocaleString()} calculated for customer`,
      priority: 'normal',
      actionUrl: `/estimates/${estimateId}`,
      actionText: 'View Estimate',
    };

    this.webSocketGateway.broadcastToRole('admin', 'estimateCalculated', {
      customerId,
      estimateId,
      totalPrice,
      calculatedBy,
      timestamp: new Date().toISOString(),
    });

    this.sendNotificationToRole('dispatcher', notification);
  }

  // Pricing rules updates
  notifyPricingRuleChanged(ruleId: string, action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated', changedBy: string) {
    const notification: NotificationData = {
      id: `rule_${ruleId}_${Date.now()}`,
      type: 'info',
      title: 'Pricing Rule Updated',
      message: `Pricing rule has been ${action}`,
      priority: 'normal',
      actionUrl: `/admin/pricing-rules/${ruleId}`,
      actionText: 'View Rule',
    };

    this.webSocketGateway.broadcastToRole('admin', 'pricingRuleChanged', {
      ruleId,
      action,
      changedBy,
      timestamp: new Date().toISOString(),
    });

    this.sendNotificationToRole('admin', notification);
    this.sendNotificationToRole('dispatcher', notification);
  }

  // System health and monitoring
  notifySystemAlert(alertType: 'warning' | 'error' | 'critical', message: string, details?: any) {
    const notification: NotificationData = {
      id: `system_alert_${Date.now()}`,
      type: alertType === 'critical' ? 'error' : alertType,
      title: `System ${alertType.toUpperCase()}`,
      message,
      priority: alertType === 'critical' ? 'urgent' : 'high',
      persistent: alertType === 'critical',
    };

    this.broadcastSystemNotification(notification);

    this.webSocketGateway.broadcastToRole('admin', 'systemAlert', {
      alertType,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Real-time statistics
  broadcastLiveStats(stats: {
    activeJobs: number;
    onlineCrews: number;
    pendingEstimates: number;
    dailyRevenue: number;
    systemLoad?: number;
  }) {
    this.webSocketGateway.broadcastToRole('admin', 'liveStats', {
      ...stats,
      timestamp: new Date().toISOString(),
    });
    this.webSocketGateway.broadcastToRole('dispatcher', 'liveStats', {
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }

  // Crew coordination
  notifyCrewCoordination(crewId: string, coordinationType: 'meetup' | 'handoff' | 'assistance', data: any) {
    this.webSocketGateway.broadcastToCrew(crewId, 'crewCoordination', {
      type: coordinationType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emergency escalation
  escalateEmergency(emergencyId: string, escalationType: 'supervisor' | 'management' | 'external', details: any) {
    const notification: NotificationData = {
      id: `emergency_${emergencyId}`,
      type: 'error',
      title: 'EMERGENCY ESCALATION',
      message: `Emergency escalated to ${escalationType}`,
      priority: 'urgent',
      persistent: true,
      actionUrl: `/emergency/${emergencyId}`,
      actionText: 'Handle Emergency',
    };

    this.webSocketGateway.broadcastToRole('admin', 'emergencyEscalation', {
      emergencyId,
      escalationType,
      details,
      timestamp: new Date().toISOString(),
    });

    this.sendNotificationToRole('admin', notification);
  }

  // Utility methods
  getConnectedUsers() {
    return this.webSocketGateway.getConnectedUsers();
  }

  getCrewStatus() {
    return this.webSocketGateway.getCrewStatus();
  }

  isUserOnline(userId: string): boolean {
    const connectedUsers = this.getConnectedUsers();
    return connectedUsers.some(user => user.userId === userId);
  }

  getOnlineCrewMembers(crewId: string): string[] {
    const connectedUsers = this.getConnectedUsers();
    return connectedUsers
      .filter(user => user.crewId === crewId && user.userRole === 'crew')
      .map(user => user.userId)
      .filter(userId => userId !== undefined) as string[];
  }
}