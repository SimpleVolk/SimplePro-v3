import { Module, forwardRef } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { AuthModule } from '../auth/auth.module';
import { RealtimeService } from './realtime.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [WebSocketGateway, RealtimeService],
  exports: [WebSocketGateway, RealtimeService],
})
export class WebSocketModule {}