import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { passportModule } from '../auth/auth.module';
import { ImageService } from './image.service';
import { IMAGE_QUEUE, ImageProcessor } from './image.processor';
import { ImageQueueService } from './image-queue.service';

@Module({
  imports: [
    passportModule,
    BullModule.registerQueue({
      name: IMAGE_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000, // oxirgi 1000 ta muvaffaqiyatli job'ni saqlash
        removeOnFail: 5000, // oxirgi 5000 ta xatoni saqlash (debug uchun)
      },
    }),
  ],
  controllers: [FileController],
  providers: [
    FileService,
    PrismaService,
    ImageService,
    ImageProcessor,
    ImageQueueService,
  ],
})
export class FileModule {}
