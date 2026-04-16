import { prisma } from "@/libs/db"
import type { OrganizationSubscription, Plan, BillingWebhookEvent } from "@prisma/client"
import type { SubscriptionUpsertInput, WebhookEventInput } from "@/modules/billing/billing.types"

export function findActiveSubscription(tenantId: string): Promise<(OrganizationSubscription & { plan: Plan }) | null> {
  return prisma.organizationSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  })
}

export function upsertSubscription(data: SubscriptionUpsertInput): Promise<OrganizationSubscription> {
  return prisma.organizationSubscription.upsert({
    where: { tenantId: data.tenantId },
    create: data,
    update: data,
  })
}

export function recordWebhookEvent(data: WebhookEventInput): Promise<BillingWebhookEvent> {
  return prisma.billingWebhookEvent.create({
    data: {
      externalEventId: data.externalEventId,
      type: data.type,
      ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
      ...(data.payload !== undefined && { payload: data.payload }),
      ...(data.processedAt !== undefined && { processedAt: data.processedAt }),
    },
  })
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
