import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  // Access token qisqa (15m): refresh rotation bor, o'g'irlangan token tez eskiradi.
  JWT_SESSION_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // Pagination: perPage berilmaganda ishlatiladigan default sahifa hajmi.
  PAGE_SIZE: Joi.number().integer().min(1).max(100).default(20),

  // Parol hash'lash kuchi (bcrypt cost). 12 — 2026 uchun tavsiya; 10 — eski default.
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

  // Email'larda ko'rinadigan ilova nomi.
  APP_NAME: Joi.string().default('Marketplace'),

  //REDIS
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Bir vaqtda nechta rasm parallel ishlanadi (image.processor.ts).
  // Bo'sh qoldirilsa — CPU yadrolari soni.
  IMAGE_CONCURRENCY: Joi.number().integer().min(1).allow('').optional(),

  // Swagger UI (/api). Development'da default ochiq, production'da default YOPIQ;
  // production'da ochilsa SWAGGER_USER/SWAGGER_PASS (basic auth) majburiy.
  SWAGGER_ENABLED: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().default(false),
    otherwise: Joi.boolean().default(true),
  }),
  SWAGGER_USER: Joi.string().allow('').default(''),
  SWAGGER_PASS: Joi.string().allow('').default(''),

  // AWS S3 — hozircha faqat audio upload (audio.controller.ts). Ixtiyoriy:
  // bo'sh bo'lsa app ishga tushadi, audio upload esa xato beradi.
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_REGION: Joi.string().allow('').default(''),
  AWS_S3_BUCKET_NAME: Joi.string().allow('').default(''),

  // Rate limiting (IP bo'yicha, barcha route'lar uchun umumiy "default" limit).
  // Qat'iy limitlar route darajasida @Throttle() bilan beriladi (auth).
  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(300),

  // Reverse proxy ortida real IP (X-Forwarded-For). 'false' | '1' | 'loopback' | CIDR.
  // Proxy'siz muhitda 'false' qoldiring — aks holda IP'ni soxtalashtirish mumkin.
  TRUST_PROXY: Joi.string().default('false'),

  // CORS whitelist — vergul bilan ajratilgan origin'lar ro'yxati.
  // Misol: "http://localhost:3000,https://app.example.com"
  // Bo'sh qoldirilsa: development'da hammasiga ruxsat, production'da rad etiladi.
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // Email (verification + reset password) — agar MAIL_TRANSPORT='console' bo'lsa,
  // SMTP_* maydonlar majburiy emas: harflar console'ga chiqariladi (dev rejim).
  MAIL_TRANSPORT: Joi.string().valid('smtp', 'console').default('console'),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('Marketplace <no-reply@marketplace.local>'),

  // Foydalanuvchi bosadigan havola uchun frontend manzili.
  // Misol: https://app.example.com — link 'https://app.example.com/verify-email?token=...' bo'ladi.
  APP_BASE_URL: Joi.string().uri().default('http://localhost:3000'),

  // Tokenlar muddati (verification email va reset password uchun).
  EMAIL_VERIFICATION_TTL: Joi.string().default('1d'),
  PASSWORD_RESET_TTL: Joi.string().default('1h'),

  // Seed (prisma/seed.ts) — super-admin foydalanuvchi. Faqat `pnpm seed` uchun;
  // app ishga tushishida majburiy emas.
  SEED_ADMIN_PHONE: Joi.string()
    .pattern(/^998\d{9}$/)
    .allow('')
    .optional(),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).allow('').optional(),
  SEED_ADMIN_EMAIL: Joi.string().email().allow('').optional(),
  SEED_ADMIN_FIRST_NAME: Joi.string().allow('').optional(),
  SEED_ADMIN_LAST_NAME: Joi.string().allow('').optional(),
});
