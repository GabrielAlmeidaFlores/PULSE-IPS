import { prisma } from "@/libs/db"
import type { Prisma, BillingWebhookEvent } from "@prisma/client"
import type { SubscriptionUpsertInput, WebhookEventInput, OrganizationSubscription, SubscriptionWithPlan } from "@/modules/billing/billing.types"
import type { PlanFeature } from "@/modules/plans/plan.types"

export function findActiveSubscription(tenantId: string): Promise<SubscriptionWithPlan | null> {
  return prisma.organizationSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  }) as unknown as Promise<SubscriptionWithPlan | null>
}

export function upsertSubscription(data: SubscriptionUpsertInput): Promise<OrganizationSubscription> {
  return prisma.organizationSubscription.upsert({
    where: { tenantId: data.tenantId },
    create: data,
    update: data,
  }) as unknown as Promise<OrganizationSubscription>
}

export function findSubscriptionByTenantId(tenantId: string): Promise<OrganizationSubscription | null> {
  return prisma.organizationSubscription.findUnique({ where: { tenantId } }) as unknown as Promise<OrganizationSubscription | null>
}

export async function createSubscriptionFeatureSnapshot(subscriptionId: string, features: PlanFeature[]): Promise<void> {
  await prisma.subscriptionFeature.createMany({
    data: features.map((feature) => ({ subscriptionId, feature })),
    skipDuplicates: true,
  })
}

export async function replaceSubscriptionFeatures(subscriptionId: string, features: PlanFeature[]): Promise<void> {
  await prisma.$transaction([
    prisma.subscriptionFeature.deleteMany({ where: { subscriptionId } }),
    prisma.subscriptionFeature.createMany({
      data: features.map((feature) => ({ subscriptionId, feature })),
    }),
  ])
}

export async function findTenantSubscriptionFeatures(tenantId: string): Promise<PlanFeature[]> {
  const sub = await prisma.organizationSubscription.findUnique({
    where: { tenantId },
    include: { features: true },
  })
  if (!sub) return []
  if (sub.features.length > 0) return sub.features.map((f) => f.feature as PlanFeature)
  const planFeatures = await prisma.planFeature.findMany({ where: { planId: sub.planId } })
  return planFeatures.map((f) => f.feature as PlanFeature)
}

export function recordWebhookEvent(data: WebhookEventInput): Promise<BillingWebhookEvent> {
  const createData: Parameters<typeof prisma.billingWebhookEvent.create>[0]["data"] = {
    externalEventId: data.externalEventId,
    type: data.type,
  }
  if (data.tenantId !== undefined) createData.tenantId = data.tenantId
  if (data.payload !== undefined) createData.payload = data.payload as Prisma.InputJsonValue
  if (data.processedAt !== undefined) createData.processedAt = data.processedAt
  return prisma.billingWebhookEvent.create({ data: createData })
}

export function findWebhookEvent(externalEventId: string): Promise<BillingWebhookEvent | null> {
  return prisma.billingWebhookEvent.findUnique({ where: { externalEventId } })
}

export function findPlanPriceForProvisioning(externalPriceId: string): Promise<(import("@prisma/client").PlanPrice & { plan: import("@prisma/client").Plan }) | null> {
  return prisma.planPrice.findFirst({
    where: { externalPriceId },
    include: { plan: true },
  })
}

export function findFailedWebhookEvents(): Promise<import("@prisma/client").BillingWebhookEvent[]> {
  return prisma.billingWebhookEvent.findMany({
    where: { processedAt: { equals: null }, error: { not: null } },
    orderBy: { createdAt: "asc" },
    take: 50,
  })
}

export async function markWebhookEventProcessed(id: string): Promise<void> {
  await prisma.billingWebhookEvent.update({ where: { id }, data: { processedAt: new Date(), error: null } })
}

export async function markWebhookEventFailed(id: string, error: string): Promise<void> {
  await prisma.billingWebhookEvent.update({ where: { id }, data: { error } })
}

export async function cancelOrganizationSubscription(externalSubscriptionId: string): Promise<void> {
  await prisma.organizationSubscription.updateMany({
    where: { externalSubscriptionId },
    data: { status: "cancelled", updatedAt: new Date() },
  })
}
