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
      .enum(["twilio_sms", "whatsapp_cloud", "console"])
      .default("console"),
    TWILIO_ACCOUNT_SID: z.string().startsWith("AC").optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_FROM_NUMBER: z.string().startsWith("+").optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
    WHATSAPP_API_VERSION: z.string().default("v20.0"),
    WHATSAPP_API_BASE_URL: z.string().url().default("https://graph.facebook.com"),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("pt_BR"),
    WHATSAPP_CONSENT_TEMPLATE_NAME: z.string().default("pulse_consent_invite"),
    WHATSAPP_SURVEY_TEMPLATE_NAME: z.string().default("pulse_survey_dispatch"),

    CONSENT_MESSAGE_TEMPLATE: z
      .string()
      .default("Oi, {nome}! 👋 Você foi convidado(a) para participar das pesquisas de bem-estar da sua empresa 🌱 É rápido, anônimo e sua opinião faz toda a diferença. Acesse o link para revisar os termos e confirmar sua participação: {link}"),

    SURVEY_MESSAGE_TEMPLATE: z
      .string()
      .default("Oi, {nome}! 👋 Tudo bem por aí? Sua opinião faz a diferença para a gente 🌱 Quando tiver um momento, aqui está o seu formulário de bem-estar: {link}"),

    EMAIL_PROVIDER: z.enum(["resend", "console"]).default("console"),
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    EMAIL_FROM: z.string().email().optional(),

    CRON_SECRET: z.string().min(16),

    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.string().default("6379"),
    REDIS_PASSWORD: z.string().optional(),

    STORAGE_PROVIDER: z.enum(["s3", "console"]).default("console"),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_S3_BUCKET: z.string().min(1).optional(),
    AWS_ENDPOINT_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
    NEXT_PUBLIC_CONSULTANT_WHATSAPP: z.string().default("5511999999999"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    MESSAGING_PROVIDER: process.env.MESSAGING_PROVIDER,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION,
    WHATSAPP_API_BASE_URL: process.env.WHATSAPP_API_BASE_URL,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
    WHATSAPP_CONSENT_TEMPLATE_NAME: process.env.WHATSAPP_CONSENT_TEMPLATE_NAME,
    WHATSAPP_SURVEY_TEMPLATE_NAME: process.env.WHATSAPP_SURVEY_TEMPLATE_NAME,

    CONSENT_MESSAGE_TEMPLATE: process.env.CONSENT_MESSAGE_TEMPLATE,

    SURVEY_MESSAGE_TEMPLATE: process.env.SURVEY_MESSAGE_TEMPLATE,

    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    CRON_SECRET: process.env.CRON_SECRET,

    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CONSULTANT_WHATSAPP: process.env.NEXT_PUBLIC_CONSULTANT_WHATSAPP,
  },
});
