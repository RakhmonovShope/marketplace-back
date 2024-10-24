import { Module } from '@nestjs/common';
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
import { ServeStaticModule } from '@nestjs/serve-static';
import { PageModule } from './api/page';
import { BannerModule } from './api/banner';
import { BadgeModule } from './api/badge';
import { StoreModule } from './api/store';
import { BrandModule } from './api/brand';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AudioModule,
    PrismaModule,
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'files'),
      serveRoot: '/files',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'audios'),
      serveRoot: '/audios',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
