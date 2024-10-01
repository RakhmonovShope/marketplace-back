import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [BannerController],
  exports: [BannerService],
  providers: [BannerService],
})
export class BannerModule {}
