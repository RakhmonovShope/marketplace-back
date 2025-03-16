import { Module } from '@nestjs/common';
import { CarService } from './car.service';
import { CarController } from './car.controller';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [CarController],
  exports: [CarService],
  providers: [CarService],
})
export class CarModule {}
