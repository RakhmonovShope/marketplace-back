import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter: CORS sozlamasi HTTP bilan BIR XIL manbadan (`CORS_ORIGINS`) olinadi.
 * Gateway dekoratoridagi statik `cors: true` (hammaga ruxsat) o'rniga.
 *
 * Whitelist bo'sh bo'lsa: development'da hammaga ruxsat, production'da hech kimga
 * (main.ts dagi HTTP CORS qoidasi bilan bir xil).
 *
 * Ko'p instans (STEP-44): shu klass `@socket.io/redis-adapter` bilan kengaytiriladi.
 */
export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigins: string[],
    private readonly allowAllWhenEmpty: boolean,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const origin = this.corsOrigins.length
      ? this.corsOrigins
      : this.allowAllWhenEmpty;

    return super.createIOServer(port, {
      ...options,
      cors: { origin, credentials: true },
    });
  }
}
