import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [BrandController],
  exports: [BrandService],
  providers: [BrandService],
})
export class BrandModule {}
