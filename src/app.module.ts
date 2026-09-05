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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PageModule } from './api/page';
import { BannerModule } from './api/banner';
import { BadgeModule } from './api/badge';
import { StoreModule } from './api/store';
import { BrandModule } from './api/brand';
import { HealthModule } from './api/health';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { envValidationSchema } from './common/env.validation.schema';

import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './common/redis.module';
import { MailModule } from './common/mail/mail.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // Rate limiting. MUHIM: @nestjs/throttler v6 da ro'yxatdagi HAR BIR named
    // throttler HAR BIR route'ga alohida qo'llanadi va @Throttle() faqat o'z nomdoshini
    // override qiladi. Shuning uchun bitta, keng "default" limit (IP bo'yicha) qoldirildi;
    // qat'iy limitlar route darajasida @Throttle({ default: {...} }) bilan beriladi
    // (auth.controller.ts), health/static fayllar @SkipThrottle() bilan.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL_MS', 60_000),
            limit: config.get<number>('THROTTLE_LIMIT', 300),
          },
        ],
      }),
    }),
    RedisModule,
    MailModule,
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
    HealthModule,
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
