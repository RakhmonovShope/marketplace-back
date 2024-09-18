import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, passportModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
