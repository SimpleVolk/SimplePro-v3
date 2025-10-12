import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPreferenceService } from '../../notifications/services/notification-preference.service';
import { NotificationTemplateService } from '../../notifications/services/notification-template.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Resolver('Notification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly templateService: NotificationTemplateService,
  ) {}

  // Queries
  @Query('notification')
  async getNotification(@Args('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Query('notifications')
  async getNotifications(@Args('filters') filters: any, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.notificationsService.findAll(userId, filters);
  }

  @Query('unreadNotificationsCount')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Query('notificationPreferences')
  async getPreferences(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.preferenceService.getPreferences(userId);
  }

  @Query('notificationTemplate')
  @Roles('super_admin', 'admin')
  async getTemplate(@Args('type') type: string) {
    return this.templateService.getTemplate(type);
  }

  // Mutations
  @Mutation('createNotification')
  @Roles('super_admin', 'admin')
  async createNotification(@Args('input') input: any) {
    return this.notificationsService.createNotification(input);
  }

  @Mutation('markNotificationAsRead')
  async markAsRead(
    @Args('id') id: string,
    @Request() req: any,
  ): Promise<boolean> {
    const userId = req.user?.sub || req.user?.userId;
    await this.notificationsService.markAsRead(id, userId);
    return true;
  }

  @Mutation('markAllNotificationsAsRead')
  async markAllAsRead(@Request() req: any): Promise<boolean> {
    const userId = req.user?.sub || req.user?.userId;
    await this.notificationsService.markAllAsRead(userId);
    return true;
  }

  @Mutation('deleteNotification')
  async deleteNotification(
    @Args('id') id: string,
    @Request() req: any,
  ): Promise<boolean> {
    const userId = req.user?.sub || req.user?.userId;
    await this.notificationsService.deleteNotification(id, userId);
    return true;
  }

  @Mutation('archiveNotification')
  async archiveNotification(
    @Args('id') id: string,
    @Request() req: any,
  ): Promise<boolean> {
    const userId = req.user?.sub || req.user?.userId;
    await this.notificationsService.archiveNotification(id, userId);
    return true;
  }

  @Mutation('updateNotificationPreferences')
  async updatePreferences(@Args('input') input: any, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.preferenceService.updatePreferences(userId, input);
  }

  @Mutation('createNotificationTemplate')
  @Roles('super_admin')
  async createTemplate(@Args('input') input: any) {
    return this.templateService.createTemplate(input);
  }

  @Mutation('updateNotificationTemplate')
  @Roles('super_admin')
  async updateTemplate(@Args('type') type: string, @Args('input') input: any) {
    return this.templateService.updateTemplate(type, input);
  }
}
