import { addMonths } from "date-fns"
import { env } from "@/env"
import { getBillingService } from "@/libs/integrations"
import { AppError } from "@/libs/errors/app-error"
import { findActiveSubscription, upsertSubscription, findPlanPriceForProvisioning } from "@/modules/billing/billing.repository"
import { findOrganizationRequired, updateOrganizationBillingStatus } from "@/modules/organizations/organization.repository"

export async function createCheckoutSession(
  tenantId: string,
  externalPriceId: string,
  options?: { successUrl?: string | undefined; cancelUrl?: string | undefined },
): Promise<string> {
  const org = await findOrganizationRequired(tenantId)
  if (!org.externalCustomerId) throw new AppError("NO_BILLING_CUSTOMER", "Organização sem cliente de faturamento.")

  const billing = getBillingService()
  const successUrl = options?.successUrl ?? `${env.NEXT_PUBLIC_APP_URL}/billing?success=true`
  const cancelUrl = options?.cancelUrl ?? `${env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`

  const { url } = await billing.createCheckoutSession({
    externalPriceId,
    externalCustomerId: org.externalCustomerId,
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

  const now = new Date()
  await upsertSubscription({
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
    snapshotExternalPriceId: planPrice.externalPriceId ?? "",
  })

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

export function getSubscription(tenantId: string): Promise<(import("@prisma/client").OrganizationSubscription & { plan: import("@prisma/client").Plan }) | null> {
  return findActiveSubscription(tenantId)
}
