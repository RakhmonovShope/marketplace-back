import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin';
import { CategoryModule } from './category';
import { AuthModule } from './auth/auth.module';
import { RoleModule } from './role';
import { FileModule } from './file/file.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PageModule } from './page';
import { BannerModule } from './banner';
import { BadgeModule } from './badge';
import { StoreModule } from './store';
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
