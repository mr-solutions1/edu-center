import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('5000'),

  // Database Configuration
  MONGO_URI: z.string().url(),

  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS & Security
  CORS_ORIGIN: z
    .string()
    .transform((val) => val.split(',').map((s) => s.trim())),
  COOKIE_DOMAIN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // Notification Providers (Optional in dev, but recommended for production)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // File Upload Configuration
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  UPLOAD_PATH: z.string().default('uploads'),

  // Health Check Key
  HEALTH_KEY: z.string().default('super_secret_health_key_123'),

  // OpenAI API Key
  OPENAI_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(_env.error.format(), null, 2)
  );
  process.exit(1);
}

export const env = _env.data;
