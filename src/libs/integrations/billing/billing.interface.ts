import type { JsonValue } from "@/libs/utils/json"

export interface BillingWebhookEvent {
  id: string
  type: string
  data: { object: JsonValue }
}

export interface CreateCheckoutSessionParams {
  externalPriceId: string
  externalCustomerId: string
  organizationId: string
  successUrl: string
  cancelUrl: string
}

export interface CreateCheckoutSessionResult {
  url: string
}

export interface CreateBillingPortalSessionParams {
  externalCustomerId: string
  returnUrl: string
}

export interface CreateBillingPortalSessionResult {
  url: string
}

export interface CreateStripeProductParams {
  name: string
  description?: string | undefined
}

export interface CreateStripePriceParams {
  externalProductId: string
  unitAmountInCents: number
  currency: string
  interval: "month" | "year"
}

export interface IBillingService {
  createProduct(params: CreateStripeProductParams): Promise<{ id: string }>
  createPrice(params: CreateStripePriceParams): Promise<{ id: string }>
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult>
  createBillingPortalSession(
    params: CreateBillingPortalSessionParams,
  ): Promise<CreateBillingPortalSessionResult>
  createCustomer(email: string, name: string): Promise<{ id: string }>
  cancelSubscription(externalSubscriptionId: string): Promise<void>
  constructWebhookEvent(payload: string | Buffer, signature: string): BillingWebhookEvent
}
