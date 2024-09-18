import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, passportModule],
  controllers: [RoleController],
  exports: [RoleService],
  providers: [RoleService],
})
export class RoleModule {}
