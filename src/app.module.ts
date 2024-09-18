import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin';
import { AuthModule } from './auth/auth.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [PrismaModule, AuthModule, AdminModule, RoleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
