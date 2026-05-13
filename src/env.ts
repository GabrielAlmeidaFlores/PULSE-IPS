import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),

    BILLING_PROVIDER: z.enum(["stripe", "fake"]).default("fake"),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

    MESSAGING_PROVIDER: z
      .enum(["smsbarato", "smsbarato-wa", "console"])
      .default("console"),
    SMSBARATO_API_KEY: z.string().min(1).optional(),
    SMSBARATO_BASE_URL: z
      .string()
      .url()
      .default("https://sistema81.smsbarato.com.br/send"),
    SMSBARATO_WA_BASE_URL: z
      .string()
      .url()
      .default("https://sistema81.smsbarato.com.br/sendwa"),
    SMSBARATO_WA_TEMPLATE: z.string().min(1).default("pulse_survey"),

    SURVEY_MESSAGE_TEMPLATE: z
      .string()
      .default(
        "Oi {nome}! Tem 1 minutinho? Sua pesquisa de bem-estar está aqui: {link}",
      ),

    EMAIL_PROVIDER: z.enum(["resend", "console"]).default("console"),
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    EMAIL_FROM: z.string().email().optional(),

    CRON_SECRET: z.string().min(16),

    INTERNAL_API_URL: z.string().url().default("http://localhost:3000"),

    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.string().default("6379"),
    REDIS_PASSWORD: z.string().optional(),

    RATE_LIMITER_PROVIDER: z.enum(["redis", "memory"]).default("redis"),

    DISABLE_SECURITY_HEADERS: z
      .string()
      .optional()
      .transform((v) => v === "true"),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("info"),

    STORAGE_PROVIDER: z.enum(["s3", "console"]).default("console"),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_S3_BUCKET: z.string().min(1).optional(),
    AWS_ENDPOINT_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_APP_VERSION: z.string().optional(),
    NEXT_PUBLIC_CONSULTANT_WHATSAPP: z.string().default("5511999999999"),
    NEXT_PUBLIC_EMAIL_SUPPORT: z
      .string()
      .email()
      .default("suporte@pulseips.com.br"),
    NEXT_PUBLIC_EMAIL_PRIVACY: z
      .string()
      .email()
      .default("privacidade@pulseips.com.br"),
    NEXT_PUBLIC_EMAIL_CONTACT: z
      .string()
      .email()
      .default("contato@pulseips.com.br"),
    NEXT_PUBLIC_EMAIL_LEGAL: z
      .string()
      .email()
      .default("legal@pulseips.com.br"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    BILLING_PROVIDER: process.env.BILLING_PROVIDER ?? "fake",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    MESSAGING_PROVIDER: process.env.MESSAGING_PROVIDER ?? "console",
    SMSBARATO_API_KEY: process.env.SMSBARATO_API_KEY,
    SMSBARATO_BASE_URL:
      process.env.SMSBARATO_BASE_URL ??
      "https://sistema81.smsbarato.com.br/send",
    SMSBARATO_WA_BASE_URL:
      process.env.SMSBARATO_WA_BASE_URL ??
      "https://sistema81.smsbarato.com.br/sendwa",
    SMSBARATO_WA_TEMPLATE: process.env.SMSBARATO_WA_TEMPLATE ?? "pulse_survey",

    SURVEY_MESSAGE_TEMPLATE: process.env.SURVEY_MESSAGE_TEMPLATE,

    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "console",
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    CRON_SECRET: process.env.CRON_SECRET,

    INTERNAL_API_URL: process.env.INTERNAL_API_URL ?? "http://localhost:3000",

    REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
    REDIS_PORT: process.env.REDIS_PORT ?? "6379",
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    RATE_LIMITER_PROVIDER: process.env.RATE_LIMITER_PROVIDER ?? "redis",

    DISABLE_SECURITY_HEADERS: process.env.DISABLE_SECURITY_HEADERS,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",

    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "console",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_CONSULTANT_WHATSAPP:
      process.env.NEXT_PUBLIC_CONSULTANT_WHATSAPP ?? "5511999999999",
    NEXT_PUBLIC_EMAIL_SUPPORT:
      process.env.NEXT_PUBLIC_EMAIL_SUPPORT ?? "suporte@pulseips.com.br",
    NEXT_PUBLIC_EMAIL_PRIVACY:
      process.env.NEXT_PUBLIC_EMAIL_PRIVACY ?? "privacidade@pulseips.com.br",
    NEXT_PUBLIC_EMAIL_CONTACT:
      process.env.NEXT_PUBLIC_EMAIL_CONTACT ?? "contato@pulseips.com.br",
    NEXT_PUBLIC_EMAIL_LEGAL:
      process.env.NEXT_PUBLIC_EMAIL_LEGAL ?? "legal@pulseips.com.br",
  },
});
