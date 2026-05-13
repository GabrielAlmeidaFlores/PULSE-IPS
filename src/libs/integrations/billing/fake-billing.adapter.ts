import type {
  IBillingService,
  BillingWebhookEvent,
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  CreateBillingPortalSessionParams,
  CreateBillingPortalSessionResult,
  CreateStripeProductParams,
  CreateStripePriceParams,
} from "@/libs/integrations/billing/billing.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-billing")

export class FakeBillingAdapter implements IBillingService {
  createProduct(params: CreateStripeProductParams): Promise<{ id: string }> {
    const id = `fake_prod_${Date.now()}`
    logger.info(`💳 createProduct: "${params.name}"`, { id })
    return Promise.resolve({ id })
  }

  createPrice(params: CreateStripePriceParams): Promise<{ id: string }> {
    const id = `fake_price_${Date.now()}`
    logger.info(`💳 createPrice: ${params.unitAmountInCents / 100} ${params.currency}/${params.interval}`, { id })
    return Promise.resolve({ id })
  }

  createCustomer(email: string, name: string): Promise<{ id: string }> {
    const id = `fake_cus_${Date.now()}`
    logger.info(`💳 createCustomer: ${name} <${email}>`, { id })
    return Promise.resolve({ id })
  }

  cancelSubscription(externalSubscriptionId: string): Promise<void> {
    logger.warn(`💳 cancelSubscription`, { externalSubscriptionId })
    return Promise.resolve()
  }

  createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CreateCheckoutSessionResult> {
    logger.info("💳 createCheckoutSession (payment auto-approved)", {
      orgId: params.organizationId,
      priceId: params.externalPriceId,
      customerId: params.externalCustomerId,
    })
    return Promise.resolve({ url: params.successUrl })
  }

  createBillingPortalSession(
    params: CreateBillingPortalSessionParams,
  ): Promise<CreateBillingPortalSessionResult> {
    logger.info("💳 createBillingPortalSession", { returnUrl: params.returnUrl })
    return Promise.resolve({ url: params.returnUrl })
  }

  constructWebhookEvent(_payload: string | Buffer, _signature: string): BillingWebhookEvent {
    logger.info("💳 constructWebhookEvent (always valid in fake mode)")
    return { id: `fake_evt_${Date.now()}`, type: "checkout.session.completed", data: { object: {} } }
  }
}
