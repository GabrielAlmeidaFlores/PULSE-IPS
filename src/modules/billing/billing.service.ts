import { addMonths, addYears } from "date-fns"
import { randomUUID } from "crypto"
import { env } from "@/env"
import { getBillingService } from "@/libs/integrations"
import { AppError } from "@/libs/errors/app-error"
import { findActiveSubscription, upsertSubscription, findPlanPriceForProvisioning, createSubscriptionFeatureSnapshot, findTenantSubscriptionFeatures, replaceSubscriptionFeatures, cancelOrganizationSubscription } from "@/modules/billing/billing.repository"
import { findOrganizationRequired, updateOrganizationBillingStatus, updateOrganizationCustomerId, setOrganizationTrialExpiresAt } from "@/modules/organizations/organization.repository"
import { findPlanFeatures, findPlanPriceById, findAllPlans } from "@/modules/plans/plan.repository"
import type { PlanFeature } from "@/modules/plans/plan.types"
import type { SubscriptionWithPlan } from "@/modules/billing/billing.types"

async function ensureStripeCustomer(tenantId: string): Promise<string> {
  const org = await findOrganizationRequired(tenantId)
  if (org.externalCustomerId) return org.externalCustomerId

  const billing = getBillingService()
  const customer = await billing.createCustomer(`${org.slug}@pulse.app`, org.name)
  await updateOrganizationCustomerId(org.id, customer.id)
  return customer.id
}

export async function createCheckoutSession(
  tenantId: string,
  externalPriceId: string,
  options?: { successUrl?: string | undefined; cancelUrl?: string | undefined },
): Promise<string> {
  const externalCustomerId = await ensureStripeCustomer(tenantId)

  const billing = getBillingService()
  const successUrl = options?.successUrl ?? `${env.NEXT_PUBLIC_APP_URL}/billing?success=true`
  const cancelUrl = options?.cancelUrl ?? `${env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`

  const { url } = await billing.createCheckoutSession({
    externalPriceId,
    externalCustomerId,
    organizationId: tenantId,
    successUrl,
    cancelUrl,
  })

  const isFakeAdapter = url === successUrl
  if (isFakeAdapter) {
    await provisionSubscription(tenantId, externalPriceId)
  }

  return url
}

async function provisionSubscription(tenantId: string, externalPriceId: string): Promise<void> {
  const planPrice = await findPlanPriceForProvisioning(externalPriceId)
  if (!planPrice) return

  if (!planPrice.externalPriceId) {
    throw new AppError("PLAN_PRICE_NOT_CONFIGURED", "Preço do plano sem ID externo configurado.")
  }

  const now = new Date()
  const sub = await upsertSubscription({
    tenantId,
    planId: planPrice.planId,
    externalSubscriptionId: `fake_sub_${Date.now()}`,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: addMonths(now, 1),
    cancelAtPeriodEnd: false,
    snapshotPlanName: planPrice.plan.name,
    snapshotMaxEmployees: planPrice.plan.maxEmployees,
    snapshotPriceInCents: planPrice.priceInCents,
    snapshotInterval: planPrice.interval,
    snapshotExternalPriceId: planPrice.externalPriceId,
  })

  const existingFeatures = await findTenantSubscriptionFeatures(tenantId)
  if (existingFeatures.length === 0) {
    const planFeatures = await findPlanFeatures(planPrice.planId)
    await createSubscriptionFeatureSnapshot(sub.id, planFeatures)
  }

  await updateOrganizationBillingStatus(tenantId, "active", planPrice.planId)
}

export async function getBillingPortalUrl(tenantId: string): Promise<string> {
  const org = await findOrganizationRequired(tenantId)
  if (!org.externalCustomerId) throw new AppError("NO_BILLING_CUSTOMER", "Organização sem cliente de faturamento.")

  const billing = getBillingService()
  const { url } = await billing.createBillingPortalSession({
    externalCustomerId: org.externalCustomerId,
    returnUrl: `${env.NEXT_PUBLIC_APP_URL}/billing`,
  })
  return url
}

export function getSubscription(tenantId: string): Promise<SubscriptionWithPlan | null> {
  return findActiveSubscription(tenantId)
}

export function getTenantPlanFeatures(tenantId: string): Promise<PlanFeature[]> {
  return findTenantSubscriptionFeatures(tenantId)
}

export async function hasTenantPlanFeature(tenantId: string, feature: PlanFeature): Promise<boolean> {
  const features = await findTenantSubscriptionFeatures(tenantId)
  return features.includes(feature)
}

export interface TenantPlanSummary {
  planName: string | null
  upgradeAvailable: boolean
}

export async function getTenantPlanSummary(tenantId: string): Promise<TenantPlanSummary> {
  const [subscription, plans] = await Promise.all([getSubscription(tenantId), findAllPlans()])
  if (subscription === null) {
    return { planName: null, upgradeAvailable: plans.length > 0 }
  }
  const upgradeAvailable = plans.some((plan) =>
    plan.prices.some((price) => price.priceInCents > subscription.snapshotPriceInCents),
  )
  return { planName: subscription.snapshotPlanName, upgradeAvailable }
}

export async function cancelOrgSubscriptionAsAdmin(tenantId: string): Promise<void> {
  const sub = await findActiveSubscription(tenantId)
  if (!sub) throw new AppError("NO_SUBSCRIPTION", "Organização sem assinatura ativa.")

  const isStripeSubscription = sub.externalSubscriptionId.startsWith("sub_")

  if (isStripeSubscription) {
    const billing = getBillingService()
    await billing.cancelSubscription(sub.externalSubscriptionId)
  }

  await cancelOrganizationSubscription(sub.externalSubscriptionId)
  await updateOrganizationBillingStatus(tenantId, "cancelled")
}

export async function assignPlanToOrgAsAdmin(
  tenantId: string,
  planPriceId: string,
  trialExpiresAt?: Date | null,
): Promise<void> {
  const planPrice = await findPlanPriceById(planPriceId)
  if (!planPrice) throw new AppError("PLAN_PRICE_NOT_FOUND", "Preço do plano não encontrado.")

  const existingSub = await findActiveSubscription(tenantId)
  const isExistingManual =
    existingSub !== null && !existingSub.externalSubscriptionId.startsWith("sub_")

  const externalSubscriptionId = isExistingManual
    ? existingSub.externalSubscriptionId
    : `manual_${randomUUID()}`

  const snapshotExternalPriceId = planPrice.externalPriceId ?? `manual_price_${planPrice.id}`

  const now = new Date()
  const currentPeriodEnd =
    planPrice.interval === "year" ? addYears(now, 1) : addMonths(now, 1)

  const sub = await upsertSubscription({
    tenantId,
    planId: planPrice.planId,
    externalSubscriptionId,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    snapshotPlanName: planPrice.plan.name,
    snapshotMaxEmployees: planPrice.plan.maxEmployees,
    snapshotPriceInCents: planPrice.priceInCents,
    snapshotInterval: planPrice.interval,
    snapshotExternalPriceId,
  })

  const planFeatures = await findPlanFeatures(planPrice.planId)
  await replaceSubscriptionFeatures(sub.id, planFeatures)

  await updateOrganizationBillingStatus(tenantId, "active", planPrice.planId)

  if (trialExpiresAt !== undefined) {
    await setOrganizationTrialExpiresAt(tenantId, trialExpiresAt)
  }
}
