import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis.module';

const PING_TIMEOUT_MS = 1000;

/**
 * Redis — sessiya/permission cache, BullMQ navbatlar. Tushib qolsa app ishlashda
 * davom etadi (DB fallback), lekin rasm processing va email navbati to'xtaydi —
 * shuning uchun `ready` false: yangi trafik boshqa instansga yo'naltirilsin.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`timeout ${PING_TIMEOUT_MS}ms`)),
            PING_TIMEOUT_MS,
          ),
        ),
      ]);

      if (pong !== 'PONG') {
        throw new Error(`unexpected reply: ${pong}`);
      }

      return this.getStatus(key, true, { status: this.redis.status });
    } catch (err) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, {
          status: this.redis.status,
          message: (err as Error).message,
        }),
      );
    }
  }
}
