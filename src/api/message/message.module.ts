import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [MessageController],
  exports: [MessageService],
  providers: [MessageService],
})

export class MessageModule {}
