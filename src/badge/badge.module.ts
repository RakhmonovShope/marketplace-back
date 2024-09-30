import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [BadgeController],
  exports: [BadgeService],
  providers: [BadgeService],
})
export class BadgeModule {}
