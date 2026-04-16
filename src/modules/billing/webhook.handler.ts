import type Stripe from "stripe"
import { upsertSubscription, recordWebhookEvent, findWebhookEvent, findFailedWebhookEvents, markWebhookEventProcessed, markWebhookEventFailed } from "@/modules/billing/billing.repository"
import type { BillingStatus } from "@/modules/billing/billing.types"
import { findOrganizationByCustomerId, updateOrganizationBillingStatus } from "@/modules/organizations/organization.repository"
import { findPlanPriceById } from "@/modules/plans/plan.repository"

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  const existing = await findWebhookEvent(event.id)
  if (existing) return

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object
      await handleSubscriptionUpdate(subscription)
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object
      await handleSubscriptionDeleted(subscription)
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object
      await handlePaymentFailed(invoice)
      break
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object
      await handlePaymentSucceeded(invoice)
      break
    }
  }

  await recordWebhookEvent({ externalEventId: event.id, type: event.type, payload: event as object, processedAt: new Date() })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const customer = await findOrganizationByCustomerId(subscription.customer as string)
  if (!customer) return

  const priceId = subscription.items.data[0]?.price.id ?? ""
  const planPrice = await findPlanPriceById(priceId)
  if (!planPrice) return

  const sub = subscription as Stripe.Subscription & { current_period_start: number; current_period_end: number }

  await upsertSubscription({
    tenantId: customer.id,
    planId: planPrice.planId,
    externalSubscriptionId: subscription.id,
    status: subscription.status as BillingStatus,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    snapshotPlanName: planPrice.plan.name,
    snapshotMaxEmployees: planPrice.plan.maxEmployees,
    snapshotPriceInCents: planPrice.priceInCents,
    snapshotInterval: planPrice.interval,
    snapshotExternalPriceId: priceId,
  })

  await updateOrganizationBillingStatus(customer.id, subscription.status as BillingStatus, planPrice.planId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customer = await findOrganizationByCustomerId(subscription.customer as string)
  if (!customer) return
  await updateOrganizationBillingStatus(customer.id, "canceled")
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customer = await findOrganizationByCustomerId(invoice.customer as string)
  if (!customer) return
  await updateOrganizationBillingStatus(customer.id, "past_due")
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customer = await findOrganizationByCustomerId(invoice.customer as string)
  if (!customer) return
  await updateOrganizationBillingStatus(customer.id, "active")
}

export async function retryFailedWebhookEvents(): Promise<{ retried: number; succeeded: number; failed: number }> {
  const failedEvents = await findFailedWebhookEvents()

  let succeeded = 0
  let failed = 0

  for (const event of failedEvents) {
    try {
      const stripeEvent = event.payload as unknown as Stripe.Event
      await handleStripeWebhook(stripeEvent)
      await markWebhookEventProcessed(event.id)
      succeeded++
    } catch (err) {
      await markWebhookEventFailed(event.id, String(err))
      failed++
    }
  }

  return { retried: failedEvents.length, succeeded, failed }
}
