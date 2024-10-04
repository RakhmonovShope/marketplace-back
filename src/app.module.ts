import { Module } from '@nestjs/common';
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
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'files'), // Replace with the correct path to the files directory
      serveRoot: '/files', // This means files will be accessible via localhost:3000/files
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
