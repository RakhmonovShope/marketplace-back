import { Module } from '@nestjs/common';
import { CarModule } from './api/car';
import { ScheduleModule } from '@nestjs/schedule';
import { MessageModule } from './api/message';
import { AudioModule } from './api/audio';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './api/admin';
import { CategoryModule } from './api/category';
import { AuthModule } from './api/auth/auth.module';
import { RoleModule } from './api/role';
import { FileModule } from './api/file/file.module';
import { ConfigModule } from '@nestjs/config';
import { PageModule } from './api/page';
import { BannerModule } from './api/banner';
import { BadgeModule } from './api/badge';
import { StoreModule } from './api/store';
import { BrandModule } from './api/brand';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MessageModule,
    AudioModule,
    AuthModule,
    AdminModule,
    RoleModule,
    CategoryModule,
    FileModule,
    PageModule,
    BadgeModule,
    BannerModule,
    StoreModule,
    BrandModule,
    CarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
