import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { passportModule } from '../auth/auth.module';
import { ImageService } from './image.service';

@Module({
  imports: [passportModule],
  controllers: [FileController],
  providers: [FileService, PrismaService, ImageService],
})
export class FileModule {}
