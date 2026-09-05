import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';

@Module({
  // AuthModule: passport (AuthGuard) + AuthService (WS handshake'da token tekshiruvi).
  imports: [AuthModule],
  controllers: [MessageController],
  exports: [MessageService],
  providers: [MessageService, ChatGateway],
})
export class MessageModule {}
