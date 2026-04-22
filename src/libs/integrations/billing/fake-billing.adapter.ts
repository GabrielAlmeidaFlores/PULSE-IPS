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

export class FakeBillingAdapter implements IBillingService {
  async createProduct(params: CreateStripeProductParams): Promise<{ id: string }> {
    const id = `fake_prod_${Date.now()}`
    console.log(`\n💳 [FAKE BILLING] createProduct: "${params.name}" → ${id}\n`)
    return { id }
  }

  async createPrice(params: CreateStripePriceParams): Promise<{ id: string }> {
    const id = `fake_price_${Date.now()}`
    console.log(
      `\n💳 [FAKE BILLING] createPrice: ${params.unitAmountInCents / 100} ${params.currency}/${params.interval} → ${id}\n`,
    )
    return { id }
  }

  async createCustomer(email: string, name: string): Promise<{ id: string }> {
    const id = `fake_cus_${Date.now()}`
    console.log(`\n💳 [FAKE BILLING] createCustomer: ${name} <${email}> → ${id}\n`)
    return { id }
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CreateCheckoutSessionResult> {
    console.log(`\n💳 [FAKE BILLING] createCheckoutSession`)
    console.log(`  orgId:       ${params.organizationId}`)
    console.log(`  priceId:     ${params.externalPriceId}`)
    console.log(`  customerId:  ${params.externalCustomerId}`)
    console.log(`  Redirecting to successUrl (payment auto-approved)\n`)
    return { url: params.successUrl }
  }

  async createBillingPortalSession(
    params: CreateBillingPortalSessionParams,
  ): Promise<CreateBillingPortalSessionResult> {
    console.log(`\n💳 [FAKE BILLING] createBillingPortalSession → ${params.returnUrl}\n`)
    return { url: params.returnUrl }
  }

  constructWebhookEvent(_payload: string | Buffer, _signature: string): BillingWebhookEvent {
    console.log(`\n💳 [FAKE BILLING] constructWebhookEvent (always valid in fake mode)\n`)
    return { id: `fake_evt_${Date.now()}`, type: "checkout.session.completed", data: { object: {} } }
  }
}
