import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { IMAGE_QUEUE } from '../file/image.processor';

/**
 * BullMQ navbati holati: kutayotgan job'lar soni chegaradan oshsa — worker
 * ulgurmayapti (yoki umuman ishlamayapti) → ready false, alert.
 */
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(@InjectQueue(IMAGE_QUEUE) private readonly imageQueue: Queue) {
    super();
  }

  async isHealthy(
    key: string,
    { maxWaiting = 500 }: { maxWaiting?: number } = {},
  ): Promise<HealthIndicatorResult> {
    try {
      const counts = await this.imageQueue.getJobCounts(
        'waiting',
        'active',
        'failed',
        'delayed',
      );

      const details = { queue: IMAGE_QUEUE, ...counts, maxWaiting };

      if (counts.waiting > maxWaiting) {
        throw new HealthCheckError(
          `Queue backlog: ${counts.waiting} waiting > ${maxWaiting}`,
          this.getStatus(key, false, details),
        );
      }

      return this.getStatus(key, true, details);
    } catch (err) {
      if (err instanceof HealthCheckError) throw err;
      // Redis yo'q bo'lsa getJobCounts xato beradi — navbat "down".
      throw new HealthCheckError(
        'Queue health check failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
