import { ConsoleMessageAdapter } from "@/libs/integrations/messaging/console-message.adapter"
import { TwilioMessageAdapter } from "@/libs/integrations/messaging/twilio-message.adapter"
import { MetaCloudMessageAdapter } from "@/libs/integrations/messaging/meta-cloud-message.adapter"
import { SmsDevAdapter } from "@/libs/integrations/messaging/smsdev.adapter"
import { SmsBaratoAdapter } from "@/libs/integrations/messaging/smsbarato.adapter"
import { ConsoleEmailAdapter } from "@/libs/integrations/email/console-email.adapter"
import { ResendAdapter } from "@/libs/integrations/email/resend.adapter"
import { FakeBillingAdapter } from "@/libs/integrations/billing/fake-billing.adapter"
import { StripeAdapter } from "@/libs/integrations/billing/stripe.adapter"
import { ConsoleStorageAdapter } from "@/libs/integrations/storage/console.adapter"
import { S3Adapter } from "@/libs/integrations/storage/s3.adapter"
import type { IMessagingService } from "@/libs/integrations/messaging/messaging.interface"
import type { IEmailService } from "@/libs/integrations/email/email.interface"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"
import type { IStorageService } from "@/libs/integrations/storage/storage.interface"
import { env } from "@/env"

export function getMessagingService(): IMessagingService {
  switch (env.MESSAGING_PROVIDER) {
    case "whatsapp_cloud":
      return new MetaCloudMessageAdapter()
    case "twilio_message":
      return new TwilioMessageAdapter()
    case "smsdev":
      return new SmsDevAdapter()
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
