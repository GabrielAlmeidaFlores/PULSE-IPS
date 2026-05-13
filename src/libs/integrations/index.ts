import { ConsoleMessageAdapter } from "@/libs/integrations/messaging/console-message.adapter"
import { SmsBaratoAdapter } from "@/libs/integrations/messaging/smsbarato.adapter"
import { ConsoleEmailAdapter } from "@/libs/integrations/email/console-email.adapter"
import { ResendAdapter } from "@/libs/integrations/email/resend.adapter"
import { FakeBillingAdapter } from "@/libs/integrations/billing/fake-billing.adapter"
import { StripeAdapter } from "@/libs/integrations/billing/stripe.adapter"
import { ConsoleStorageAdapter } from "@/libs/integrations/storage/console.adapter"
import { S3Adapter } from "@/libs/integrations/storage/s3.adapter"
import { RedisRateLimiterAdapter } from "@/libs/integrations/rate-limiter/redis-rate-limiter.adapter"
import { InMemoryRateLimiterAdapter } from "@/libs/integrations/rate-limiter/in-memory-rate-limiter.adapter"
import type { IMessagingService } from "@/libs/integrations/messaging/messaging.interface"
import type { IEmailService } from "@/libs/integrations/email/email.interface"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"
import type { IStorageService } from "@/libs/integrations/storage/storage.interface"
import type { IRateLimiterService } from "@/libs/integrations/rate-limiter/rate-limiter.interface"
import { env } from "@/env"

export function getMessagingService(): IMessagingService {
  switch (env.MESSAGING_PROVIDER) {
    case "smsbarato":
      return new SmsBaratoAdapter()
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

let rateLimiterServiceInstance: IRateLimiterService | undefined

export function getRateLimiterService(): IRateLimiterService {
  if (rateLimiterServiceInstance !== undefined) return rateLimiterServiceInstance
  rateLimiterServiceInstance =
    env.RATE_LIMITER_PROVIDER === "redis"
      ? new RedisRateLimiterAdapter()
      : new InMemoryRateLimiterAdapter()
  return rateLimiterServiceInstance
}
