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
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import { randomUUID } from 'crypto';

import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // Sentry (SENTRY_DSN bo'lsa src/instrument.ts da init qilinadi; bo'lmasa inert).
    SentryModule.forRoot(),

    // Strukturali JSON loglar (pino) + har so'rovga request id.
    // Dev'da pino-pretty (LOG_PRETTY), prod'da toza JSON → stdout → Loki/ELK.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        // Joi bo'sh qiymatni ('') o'tkazadi — uni "berilmagan" deb hisoblaymiz.
        const prettyRaw = config.get<boolean | string>('LOG_PRETTY');
        const pretty =
          prettyRaw === undefined || prettyRaw === ''
            ? !isProd
            : prettyRaw === true || prettyRaw === 'true';
        const level =
          config.get<string>('LOG_LEVEL') || (isProd ? 'info' : 'debug');

        return {
          pinoHttp: {
            level,
            transport: pretty
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            // Request id: mijoz/proxy bergan X-Request-Id, bo'lmasa UUID.
            // Javob sarlavhasiga ham qo'yiladi — frontend xato haqida yozganda shu id.
            genReqId: (req, res) => {
              const header = req.headers['x-request-id'];
              const id =
                (Array.isArray(header) ? header[0] : header) || randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            // Javob tugaganda hisoblanadi — guard'lar allaqachon req.user ni qo'ygan.
            customProps: (req) => ({
              userId: (req as { user?: { id?: string } }).user?.id,
            }),
            customLogLevel: (_req, res, err) =>
              err || res.statusCode >= 500
                ? 'error'
                : res.statusCode >= 400
                  ? 'warn'
                  : 'info',
            autoLogging: {
              ignore: (req) =>
                req.url === '/health' ||
                req.url?.startsWith('/health/') ||
                req.url?.startsWith('/files/') ||
                req.url?.startsWith('/api') ||
                req.url?.startsWith('/metrics'),
            },
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie'],
              censor: '[redacted]',
            },
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                ip: req.remoteAddress,
              }),
              res: (res) => ({ statusCode: res.statusCode }),
            },
          },
        };
      },
    }),

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
