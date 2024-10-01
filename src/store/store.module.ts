import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [StoreController],
  exports: [StoreService],
  providers: [StoreService],
})
export class StoreModule {}
