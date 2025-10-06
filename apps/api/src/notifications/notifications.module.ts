import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationConfigService } from './config/notification-config.service';
import { NotificationEventListener } from './listeners/notification-event.listener';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './schemas/notification-preference.schema';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification-template.schema';
import { AuthModule } from '../auth/auth.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => WebSocketModule),
    EventEmitterModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    NotificationPreferenceService,
    NotificationTemplateService,
    NotificationConfigService,
    NotificationEventListener,
  ],
  exports: [
    NotificationsService,
    NotificationDeliveryService,
    NotificationPreferenceService,
    NotificationTemplateService,
    NotificationConfigService,
  ],
})
export class NotificationsModule {
  // Templates are seeded automatically via NotificationTemplateService.onModuleInit()
  // Notification services (email, SMS, push) are initialized via NotificationConfigService.onModuleInit()
}
