import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { AuthModule } from '../auth/auth.module';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [AuthModule],
  providers: [WebSocketGateway, RealtimeService],
  exports: [WebSocketGateway, RealtimeService],
})
export class WebSocketModule {}