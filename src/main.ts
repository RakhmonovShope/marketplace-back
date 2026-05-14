import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { TransformInterceptor } from './transform.interceptor';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const isProd = nodeEnv === 'production';

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

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description for your application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

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
