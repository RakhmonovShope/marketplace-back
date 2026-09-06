import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { QueueHealthIndicator } from './queue.health';

/**
 * Healthcheck'lar barqaror, versiyalanmagan URL'larda (monitoring/orchestrator uchun):
 *
 *   GET /health/live   — jarayon tirik (liveness). Faqat "javob bera olyaptimi".
 *                        Bu yiqilsa orchestrator konteynerni QAYTA ISHGA TUSHIRADI.
 *   GET /health/ready  — trafik qabul qilishga tayyor (readiness): DB, Redis,
 *                        disk, heap, navbat. Yiqilsa trafik boshqa instansga ketadi,
 *                        konteyner o'chirilmaydi.
 *   GET /health        — `ready` aliasi (mavjud monitoring/Docker HEALTHCHECK uchun).
 */
@ApiTags('Health')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly uploadsDir = join(process.cwd(), 'uploads');
  private readonly heapLimitBytes: number;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly queueHealth: QueueHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    config: ConfigService,
  ) {
    this.heapLimitBytes =
      config.get<number>('HEALTH_HEAP_LIMIT_MB', 1024) * 1024 * 1024;
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness — process is up' })
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness — DB, Redis, disk, heap, queue' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () =>
        this.disk.checkStorage('storage', {
          path: this.uploadsDir,
          thresholdPercent: 0.9, // disk 90% dan ko'p to'lsa — unhealthy
        }),
      () => this.memory.checkHeap('memory_heap', this.heapLimitBytes),
      () => this.queueHealth.isHealthy('image_queue', { maxWaiting: 500 }),
    ]);
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Alias of /health/ready' })
  check(): Promise<HealthCheckResult> {
    return this.ready();
  }
}
