import Stripe from "stripe"
import { env } from "@/env"
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
import type { JsonValue } from "@/libs/utils/json"

export class StripeAdapter implements IBillingService {
  private stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "")

  async createProduct(params: CreateStripeProductParams): Promise<{ id: string }> {
    const product = await this.stripe.products.create({
      name: params.name,
      ...(params.description !== undefined && { description: params.description }),
    })
    return { id: product.id }
  }

  async createPrice(params: CreateStripePriceParams): Promise<{ id: string }> {
    const price = await this.stripe.prices.create({
      product: params.externalProductId,
      unit_amount: params.unitAmountInCents,
      currency: params.currency,
      recurring: { interval: params.interval },
    })
    return { id: price.id }
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CreateCheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: params.externalCustomerId,
      line_items: [{ price: params.externalPriceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { organizationId: params.organizationId },
    })
    return { url: session.url ?? "" }
  }

  async createBillingPortalSession(
    params: CreateBillingPortalSessionParams,
  ): Promise<CreateBillingPortalSessionResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.externalCustomerId,
      return_url: params.returnUrl,
    })
    return { url: session.url }
  }

  async createCustomer(email: string, name: string): Promise<{ id: string }> {
    const customer = await this.stripe.customers.create({ email, name })
    return { id: customer.id }
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): BillingWebhookEvent {
    const raw = this.stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET ?? "")
    return {
      id: raw.id,
      type: raw.type,
      data: { object: raw.data.object as unknown as JsonValue },
    }
  }
}
