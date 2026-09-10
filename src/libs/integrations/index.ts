import { ConsoleMessageAdapter } from "@/libs/integrations/messaging/console-message.adapter"
import { SmsBaratoAdapter } from "@/libs/integrations/messaging/smsbarato.adapter"
import { SmsBaratoWaAdapter } from "@/libs/integrations/messaging/smsbarato-wa.adapter"
import { ConsoleEmailAdapter } from "@/libs/integrations/email/console-email.adapter"
import { ResendAdapter } from "@/libs/integrations/email/resend.adapter"
import { FakeBillingAdapter } from "@/libs/integrations/billing/fake-billing.adapter"
import { StripeAdapter } from "@/libs/integrations/billing/stripe.adapter"
import { ConsoleStorageAdapter } from "@/libs/integrations/storage/console.adapter"
import { S3Adapter } from "@/libs/integrations/storage/s3.adapter"
import { ConsoleAIService } from "@/libs/integrations/ai/console-ai.adapter"
import { OpenAIAdapter } from "@/libs/integrations/ai/openai.adapter"
import { ClaudeAdapter } from "@/libs/integrations/ai/claude.adapter"
import { GeminiAdapter } from "@/libs/integrations/ai/gemini.adapter"
import { RedisRateLimiterAdapter } from "@/libs/integrations/rate-limiter/redis-rate-limiter.adapter"
import { InMemoryRateLimiterAdapter } from "@/libs/integrations/rate-limiter/in-memory-rate-limiter.adapter"
import type { IMessagingService } from "@/libs/integrations/messaging/messaging.interface"
import type { IEmailService } from "@/libs/integrations/email/email.interface"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"
import type { IStorageService } from "@/libs/integrations/storage/storage.interface"
import type { IAIService } from "@/libs/integrations/ai/ai.interface"
import type { IRateLimiterService } from "@/libs/integrations/rate-limiter/rate-limiter.interface"
import { env } from "@/env"

export function getMessagingService(): IMessagingService {
  switch (env.MESSAGING_PROVIDER) {
    case "smsbarato":
      return new SmsBaratoAdapter()
    case "smsbarato-wa":
      return new SmsBaratoWaAdapter()
    default:
      return new ConsoleMessageAdapter()
  }
}

export function getEmailService(): IEmailService {
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return new ResendAdapter()
    default:
      return new ConsoleEmailAdapter()
  }
}

export function getBillingService(): IBillingService {
  switch (env.BILLING_PROVIDER) {
    case "stripe":
      return new StripeAdapter()
    default:
      return new FakeBillingAdapter()
  }
}

export function getStorageService(): IStorageService {
  switch (env.STORAGE_PROVIDER) {
    case "s3":
      return new S3Adapter()
    default:
      return new ConsoleStorageAdapter()
  }
}

export function getAIService(): IAIService {
  switch (env.AI_PROVIDER) {
    case "openai":
      return new OpenAIAdapter()
    case "claude":
      return new ClaudeAdapter()
    case "gemini":
      return new GeminiAdapter()
    default:
      return new ConsoleAIService()
  }
}

let rateLimiterServiceInstance: IRateLimiterService | undefined

export function getRateLimiterService(): IRateLimiterService {
  if (rateLimiterServiceInstance !== undefined) return rateLimiterServiceInstance
  rateLimiterServiceInstance =
    env.RATE_LIMITER_PROVIDER === "redis"
      ? new RedisRateLimiterAdapter()
      : new InMemoryRateLimiterAdapter()
  return rateLimiterServiceInstance
}
