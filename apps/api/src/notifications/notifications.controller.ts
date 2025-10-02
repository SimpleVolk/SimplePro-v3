import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationTemplateService } from './services/notification-template.service';
import {
  CreateNotificationDto,
  UpdatePreferencesDto,
  NotificationFiltersDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly templateService: NotificationTemplateService,
  ) {}

  // ==================== Notifications ====================

  @Post()
  @Roles('super_admin', 'admin')
  async createNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.createNotification(dto);
    return {
      success: true,
      data: notification,
      message: 'Notification created and sent successfully',
    };
  }

  @Get()
  async findAll(@Query() filters: NotificationFiltersDto, @Request() req: any) {
    const userId = req.user.sub;
    const notifications = await this.notificationsService.findAll(userId, filters);
    return {
      success: true,
      data: notifications,
      count: notifications.length,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return {
      success: true,
      data: { count },
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const notification = await this.notificationsService.findById(id);
    return {
      success: true,
      data: notification,
    };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    await this.notificationsService.markAsRead(id, userId);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Post('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.sub;
    await this.notificationsService.markAllAsRead(userId);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    await this.notificationsService.deleteNotification(id, userId);
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  @Post(':id/archive')
  async archiveNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    await this.notificationsService.archiveNotification(id, userId);
    return {
      success: true,
      message: 'Notification archived successfully',
    };
  }

  // ==================== Preferences ====================

  @Get('preferences/me')
  async getPreferences(@Request() req: any) {
    const userId = req.user.sub;
    const preferences = await this.preferenceService.getPreferences(userId);
    return {
      success: true,
      data: preferences,
    };
  }

  @Patch('preferences/me')
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @Request() req: any) {
    const userId = req.user.sub;
    const preferences = await this.preferenceService.updatePreferences(userId, dto);
    return {
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    };
  }

  // ==================== Testing ====================

  @Post('test')
  @Roles('super_admin', 'admin')
  async sendTestNotification(@Body() dto: { recipientId: string; type: string; data?: any }) {
    const notification = await this.notificationsService.createNotification({
      recipientId: dto.recipientId,
      type: dto.type,
      data: dto.data || {},
    });
    return {
      success: true,
      data: notification,
      message: 'Test notification sent',
    };
  }

  // ==================== Templates (Admin Only) ====================

  @Get('templates/all')
  @Roles('super_admin', 'admin')
  async getAllTemplates() {
    // This would need to be implemented in the template service
    // For now, returning a placeholder response
    return {
      success: true,
      message: 'Templates endpoint - to be implemented',
    };
  }

  @Get('templates/:type')
  @Roles('super_admin', 'admin')
  async getTemplate(@Param('type') type: string) {
    const template = await this.templateService.getTemplate(type);
    return {
      success: true,
      data: template,
    };
  }

  @Post('templates')
  @Roles('super_admin')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    const template = await this.templateService.createTemplate(dto);
    return {
      success: true,
      data: template,
      message: 'Template created successfully',
    };
  }

  @Patch('templates/:type')
  @Roles('super_admin')
  async updateTemplate(@Param('type') type: string, @Body() dto: UpdateTemplateDto) {
    const template = await this.templateService.updateTemplate(type, dto);
    return {
      success: true,
      data: template,
      message: 'Template updated successfully',
    };
  }
}
