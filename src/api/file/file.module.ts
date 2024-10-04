import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { passportModule } from '../auth/auth.module';

@Module({
  imports: [passportModule],
  controllers: [FileController],
  providers: [FileService, PrismaService],
})
export class FileModule {}
