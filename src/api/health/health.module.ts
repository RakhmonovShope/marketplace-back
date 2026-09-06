import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { QueueHealthIndicator } from './queue.health';
import { IMAGE_QUEUE } from '../file/image.processor';

@Module({
  imports: [
    // Terminus loglarini o'zimizning filter/pino boshqaradi.
    TerminusModule.forRoot({ logger: false }),
    // Navbat holatini o'qish uchun Queue handle (processor emas).
    BullModule.registerQueue({ name: IMAGE_QUEUE }),
  ],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    QueueHealthIndicator,
  ],
})
export class HealthModule {}
