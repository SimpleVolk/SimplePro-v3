import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageThread, MessageThreadSchema } from './schemas/message-thread.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { TypingIndicator, TypingIndicatorSchema } from './schemas/typing-indicator.schema';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { TypingService } from './typing.service';
import { MessageNotificationService } from './message-notification.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageThread.name, schema: MessageThreadSchema },
      { name: Message.name, schema: MessageSchema },
      { name: TypingIndicator.name, schema: TypingIndicatorSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    TypingService,
    MessageNotificationService,
  ],
  exports: [MessagesService, TypingService],
})
export class MessagesModule {}
