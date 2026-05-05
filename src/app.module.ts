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

import { envValidationSchema } from './common/env.validation.schema';

import { RedisModule } from './common/redis.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default', // 👈 default qo'shildi
        ttl: 60_000,
        limit: 10,
      },
      {
        name: 'short', // qisqa muddat — 1 soniya
        ttl: 1000,
        limit: 5, // 1 soniyada 5 ta so'rov
      },
      {
        name: 'medium', // o'rta muddat — 10 soniya
        ttl: 10_000,
        limit: 30, // 10 soniyada 30 ta so'rov
      },
      {
        name: 'long', // uzoq muddat — 1 daqiqa
        ttl: 60_000,
        limit: 100, // 1 daqiqada 100 ta so'rov
      },
    ]),
    RedisModule,
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
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
