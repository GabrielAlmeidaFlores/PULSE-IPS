import type { JsonValue } from "@/libs/utils/json"
import type { Plan } from "@/modules/plans/plan.types"

export type BillingStatus = "pending" | "active" | "past_due" | "cancelled" | "trialing" | "suspended" | "unpaid"

export interface OrganizationSubscription {
  id: string
  tenantId: string
  planId: string
  externalSubscriptionId: string
  status: BillingStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  snapshotPlanName: string
  snapshotMaxEmployees: number | null
  snapshotPriceInCents: number
  snapshotInterval: string
  snapshotExternalPriceId: string
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionWithPlan = OrganizationSubscription & { plan: Plan }

export interface SubscriptionUpsertInput {
  tenantId: string
  planId: string
  externalSubscriptionId: string
  status: BillingStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  snapshotPlanName: string
  snapshotMaxEmployees: number
  snapshotPriceInCents: number
  snapshotInterval: string
  snapshotExternalPriceId: string
}

export interface WebhookEventInput {
  tenantId?: string | undefined
  externalEventId: string
  type: string
  payload?: JsonValue | undefined
  processedAt?: Date | undefined
}
