import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger('RedisModule');

        const client = new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => logger.log('Redis connected ✅'));
        client.on('error', (err) =>
          logger.error(`Redis error: ${err.message}`),
        );

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * SIGTERM/SIGINT'da (enableShutdownHooks) Redis ulanishini toza yopamiz:
   * `quit()` navbatdagi buyruqlar bajarilishini kutadi, keyin uzadi.
   * Aks holda jarayon ochiq socket bilan qoladi (Docker'da stop kechikadi).
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log(`Redis connection closed (${signal ?? 'shutdown'})`);
    } catch (err) {
      this.logger.warn(`Redis quit failed: ${(err as Error).message}`);
      this.redis.disconnect();
    }
  }
}
