import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [AudioController],
  exports: [AudioService],
  providers: [AudioService],
})
export class AudioModule {}
