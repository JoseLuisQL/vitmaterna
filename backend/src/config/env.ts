import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/v1'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(1000),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Health Facility Defaults
  DEFAULT_ALTITUDE_MSNM: z.coerce.number().int().default(2926),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // Canales de notificación (opcionales). Sin credenciales se usa modo mock.
  // SMS (Twilio)
  SMS_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),
  // WhatsApp: proveedor seleccionable.
  //  - whatsapp_cloud: WhatsApp Business Cloud API de Meta.
  //  - openwa: gateway WhatsApp self-hosted y gratuito (open-wa.org). No exige
  //    plantillas HSM, así que los mensajes proactivos (recordatorios) funcionan
  //    con texto libre.
  WHATSAPP_PROVIDER: z.enum(['mock', 'whatsapp_cloud', 'openwa']).default('mock'),
  WHATSAPP_API_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
  // Versión de la Graph API de Meta para WhatsApp (configurable para migraciones).
  WHATSAPP_API_VERSION: z.string().optional().default('v21.0'),
  // OpenWA (WhatsApp self-hosted). Respaldo de entorno; el admin también puede
  // configurarlo desde la app (SystemConfig['whatsappConfig']).
  OPENWA_BASE_URL: z.string().optional().default(''), // ej. https://openwa.qware.me
  OPENWA_API_KEY: z.string().optional().default(''),
  OPENWA_SESSION_ID: z.string().optional().default(''), // ID (uuid) de la sesión, NO el nombre
  // Secreto para firmar/verificar los webhooks entrantes de OpenWA (HMAC-SHA256).
  // Debe coincidir con el `secret` registrado en el webhook de OpenWA.
  OPENWA_WEBHOOK_SECRET: z.string().optional().default(''),
  // URL pública del backend (https://...), para construir URLs absolutas de los
  // archivos servidos en /uploads (p. ej. imágenes del chat enviadas por WhatsApp,
  // o thumbnails del contenido educativo). Vacío = no se envían medios por URL.
  PUBLIC_BASE_URL: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
