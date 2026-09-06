/**
 * Sentry — xatolarni kuzatish. Bu fayl `main.ts` da ENG BIRINCHI import qilinadi
 * (Nest/Express importlaridan oldin) — auto-instrumentation shuni talab qiladi.
 *
 * `SENTRY_DSN` bo'lmasa hech narsa qilmaydi: `Sentry.captureException` no-op bo'ladi.
 *
 * Eslatma: bu nuqtada ConfigModule hali `.env` ni o'qimagan (dev'da), shuning uchun
 * SENTRY_* kalitlarini `.env` dan o'zimiz minimal o'qiymiz. Production'da o'zgaruvchilar
 * muhitdan keladi.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as Sentry from '@sentry/nestjs';

const readEnv = (key: string): string | undefined => {
  if (process.env[key]) return process.env[key];
  try {
    const line = fs
      .readFileSync(path.join(process.cwd(), '.env'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${key}=`));
    return line
      ?.slice(key.length + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\s+#.*$/, '');
  } catch {
    return undefined;
  }
};

const dsn = readEnv('SENTRY_DSN');

if (dsn) {
  Sentry.init({
    dsn,
    environment: readEnv('APP_ENV') ?? readEnv('NODE_ENV') ?? 'development',
    release: readEnv('SENTRY_RELEASE') || undefined,
    // Performance tracing — default o'chiq (0); kerak bo'lsa 0.05–0.2.
    tracesSampleRate: Number(readEnv('SENTRY_TRACES_SAMPLE_RATE') ?? 0),
    sendDefaultPii: false,
  });
}

export const sentryEnabled = Boolean(dsn);
