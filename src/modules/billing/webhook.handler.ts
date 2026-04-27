import type { BillingWebhookEvent } from "@/libs/integrations/billing/billing.interface"
import { upsertSubscription, recordWebhookEvent, findWebhookEvent, findFailedWebhookEvents, markWebhookEventProcessed, markWebhookEventFailed, createSubscriptionFeatureSnapshot, findTenantSubscriptionFeatures } from "@/modules/billing/billing.repository"
import type { BillingStatus } from "@/modules/billing/billing.types"
import { findOrganizationByCustomerId, updateOrganizationBillingStatus } from "@/modules/organizations/organization.repository"
import { findPlanPriceById, findPlanFeatures } from "@/modules/plans/plan.repository"

interface WebhookSubscriptionData {
  id: string
  status: string
  customer: string
  cancel_at_period_end: boolean
  current_period_start: number
  current_period_end: number
  items: { data: { price: { id: string } }[] }
}

interface WebhookInvoiceData {
  customer: string
}

export async function handleStripeWebhook(event: BillingWebhookEvent): Promise<void> {
  const existing = await findWebhookEvent(event.id)
  if (existing) return

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as unknown as WebhookSubscriptionData
      await handleSubscriptionUpdate(subscription)
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as WebhookSubscriptionData
      await handleSubscriptionDeleted(subscription)
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as WebhookInvoiceData
      await handlePaymentFailed(invoice)
      break
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as unknown as WebhookInvoiceData
      await handlePaymentSucceeded(invoice)
      break
    }
  }

  await recordWebhookEvent({ externalEventId: event.id, type: event.type, payload: event as unknown as import("@/libs/utils/json").JsonValue, processedAt: new Date() })
}

async function handleSubscriptionUpdate(subscription: WebhookSubscriptionData): Promise<void> {
  const customer = await findOrganizationByCustomerId(subscription.customer)
  if (!customer) return

  const priceId = subscription.items.data[0]?.price.id ?? ""
  const planPrice = await findPlanPriceById(priceId)
  if (!planPrice) return

  const sub = await upsertSubscription({
    tenantId: customer.id,
    planId: planPrice.planId,
    externalSubscriptionId: subscription.id,
    status: subscription.status as BillingStatus,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    snapshotPlanName: planPrice.plan.name,
    snapshotMaxEmployees: planPrice.plan.maxEmployees,
    snapshotPriceInCents: planPrice.priceInCents,
    snapshotInterval: planPrice.interval,
    snapshotExternalPriceId: priceId,
  })

  const existingFeatures = await findTenantSubscriptionFeatures(customer.id)
  if (existingFeatures.length === 0) {
    const planFeatures = await findPlanFeatures(planPrice.planId)
    await createSubscriptionFeatureSnapshot(sub.id, planFeatures)
  }

  await updateOrganizationBillingStatus(customer.id, subscription.status as BillingStatus, planPrice.planId)
}

async function handleSubscriptionDeleted(subscription: WebhookSubscriptionData): Promise<void> {
  const customer = await findOrganizationByCustomerId(subscription.customer)
  if (!customer) return
  await updateOrganizationBillingStatus(customer.id, "cancelled")
}

async function handlePaymentFailed(invoice: WebhookInvoiceData): Promise<void> {
  const customer = await findOrganizationByCustomerId(invoice.customer)
  if (!customer) return
  await updateOrganizationBillingStatus(customer.id, "past_due")
}

async function handlePaymentSucceeded(invoice: WebhookInvoiceData): Promise<void> {
  const customer = await findOrganizationByCustomerId(invoice.customer)
  if (!customer) return
  await updateOrganizationBillingStatus(customer.id, "active")
}

export async function retryFailedWebhookEvents(): Promise<{ retried: number; succeeded: number; failed: number }> {
  const failedEvents = await findFailedWebhookEvents()

  let succeeded = 0
  let failed = 0

  for (const event of failedEvents) {
    try {
      const webhookEvent = event.payload as unknown as BillingWebhookEvent
      await handleStripeWebhook(webhookEvent)
      await markWebhookEventProcessed(event.id)
      succeeded++
    } catch (err) {
      await markWebhookEventFailed(event.id, String(err))
      failed++
    }
  }

  return { retried: failedEvents.length, succeeded, failed }
}
