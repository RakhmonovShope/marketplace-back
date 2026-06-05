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
  JWT_SESSION_EXPIRATION: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  //REDIS
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // AWS S3 (audio.controller.ts da ishlatilgan)
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),

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
});
