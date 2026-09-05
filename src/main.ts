// libuv threadpool — sharp/fs async operatsiyalari shu pool'da ishlaydi.
// Default 4 — yuqori yukda kam. Yadrolar soniga (kamida 4) ko'taramiz.
// MUHIM: bu boshqa importlardan OLDIN, pool yaratilmasdan turib o'rnatilishi kerak.
import * as os from 'os';
if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = String(Math.max(4, os.cpus().length));
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import { TransformInterceptor } from './transform.interceptor';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/logging.interceptor';
import { ConfiguredIoAdapter } from './common/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const isProd = nodeEnv === 'production';

  // Reverse proxy (nginx / load balancer) ortida real mijoz IP'sini
  // X-Forwarded-For'dan olish — throttler va loglar uchun. Proxy'siz muhitda
  // YOQILMAYDI (aks holda mijoz sarlavhani soxtalashtirib limitni chetlab o'tadi).
  // TRUST_PROXY: 'false' (default) | '1' (bitta proxy) | 'loopback' | CIDR.
  const trustProxy = configService.get<string>('TRUST_PROXY', 'false');
  if (trustProxy !== 'false') {
    app
      .getHttpAdapter()
      .getInstance()
      .set(
        'trust proxy',
        /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
      );
  }

  // Swagger UI uchun inline script/style talab qilinadi,
  // shuning uchun development'da CSP'ni o'chirib qo'yamiz.
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Server-to-server, Postman, curl yoki shu xil so'rovlarda Origin yo'q.
      if (!origin) {
        return callback(null, true);
      }

      // Whitelist bo'sh:
      // - development: hammasiga ruxsat (qulaylik uchun);
      // - production: hech kimga ruxsat yo'q (xavfsizlik).
      if (corsOrigins.length === 0) {
        if (isProd) {
          logger.warn(`CORS rad etildi (whitelist bo'sh): ${origin}`);
          return callback(null, false);
        }
        return callback(null, true);
      }

      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS rad etildi: ${origin}`);
      // false qaytaramiz: Access-Control-* sarlavhalari qo'shilmaydi,
      // brauzer so'rovni o'zi rad etadi. Server 500 qaytarmaydi.
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  // WebSocket (Socket.IO) CORS — HTTP bilan bir xil whitelist.
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, corsOrigins, !isProd));

  // URI-based API versioning: barcha route'lar /v1/... prefiksini oladi.
  // Versiya ko'rsatilmagan controller'lar avtomatik defaultVersion'ni oladi.
  // Versioning shart bo'lmagan joylar (health, root) VERSION_NEUTRAL bilan
  // belgilangan va prefikssiz qoladi.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da e'lon qilinmagan maydonlarni olib tashlaydi
      forbidNonWhitelisted: true, // ortiqcha maydon yuborilsa 400 xato qaytaradi
      transform: true, // payload'ni DTO instance'ga aylantiradi + tip coercion
    }),
  );
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger UI (/api). Development'da ochiq; production'da default YOPIQ
  // (SWAGGER_ENABLED=false). Ochilsa — faqat basic auth (SWAGGER_USER/PASS) bilan.
  if (configService.get<boolean>('SWAGGER_ENABLED')) {
    const swaggerUser = configService.get<string>('SWAGGER_USER');
    const swaggerPass = configService.get<string>('SWAGGER_PASS');

    if (isProd && !(swaggerUser && swaggerPass)) {
      logger.warn(
        "SWAGGER_ENABLED=true, lekin SWAGGER_USER/SWAGGER_PASS berilmagan — production'da Swagger o'chirildi",
      );
    } else {
      if (isProd) {
        app.use(
          ['/api', '/api-json', '/api-yaml'],
          basicAuth({ users: { [swaggerUser]: swaggerPass }, challenge: true }),
        );
      }

      const config = new DocumentBuilder()
        .setTitle('API Documentation')
        .setDescription('The API description for your application')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document);
      logger.log(`Swagger UI: /api${isProd ? ' (basic auth)' : ''}`);
    }
  }

  // Graceful shutdown: SIGTERM/SIGINT'da BullMQ worker'lar to'g'ri yopiladi —
  // ayni damdagi job'lar tugatiladi yoki navbatga qaytariladi (yo'qolmaydi).
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  logger.log(`App ishga tushdi: http://localhost:${port}`);
  logger.log(`NODE_ENV=${nodeEnv}`);
  logger.log(
    corsOrigins.length
      ? `CORS whitelist: ${corsOrigins.join(', ')}`
      : `CORS whitelist bo'sh (${isProd ? 'PROD: hammasi rad etiladi' : 'DEV: hammasiga ruxsat'})`,
  );
}

bootstrap();
