import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleStripeWebhook, retryFailedWebhookEvents } from "@/modules/billing/webhook.handler"
import type { BillingWebhookEvent } from "@/libs/integrations/billing/billing.interface"
import {
  findWebhookEvent,
  recordWebhookEvent,
  upsertSubscription,
  findFailedWebhookEvents,
  markWebhookEventProcessed,
  markWebhookEventFailed,
  findTenantSubscriptionFeatures,
  createSubscriptionFeatureSnapshot,
} from "@/modules/billing/billing.repository"
import { findOrganizationByCustomerId, updateOrganizationBillingStatus } from "@/modules/organizations/organization.repository"
import { findPlanPriceById, findPlanFeatures } from "@/modules/plans/plan.repository"

vi.mock("@/modules/billing/billing.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/plans/plan.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindWebhookEvent = vi.mocked(findWebhookEvent)
const mockRecordWebhookEvent = vi.mocked(recordWebhookEvent)
const mockUpsertSubscription = vi.mocked(upsertSubscription)
const mockFindFailedWebhookEvents = vi.mocked(findFailedWebhookEvents)
const mockMarkWebhookEventProcessed = vi.mocked(markWebhookEventProcessed)
const mockMarkWebhookEventFailed = vi.mocked(markWebhookEventFailed)
const mockFindTenantSubscriptionFeatures = vi.mocked(findTenantSubscriptionFeatures)
const mockCreateSubscriptionFeatureSnapshot = vi.mocked(createSubscriptionFeatureSnapshot)
const mockFindOrgByCustomerId = vi.mocked(findOrganizationByCustomerId)
const mockUpdateOrgBillingStatus = vi.mocked(updateOrganizationBillingStatus)
const mockFindPlanPriceById = vi.mocked(findPlanPriceById)
const mockFindPlanFeatures = vi.mocked(findPlanFeatures)

const ORG = { id: "org-1", slug: "acme" }
const PLAN_PRICE = {
  id: "pp-1",
  planId: "plan-1",
  priceInCents: 5000,
  interval: "monthly",
  currency: "brl",
  externalPriceId: "price_ext",
  plan: { name: "Starter", maxEmployees: 50, externalProductId: "prod_1" },
}

const SUBSCRIPTION_CREATED = "customer.subscription.created"
const SUBSCRIPTION_UPDATED = "customer.subscription.updated"
const SUBSCRIPTION_DELETED = "customer.subscription.deleted"

interface WebhookEventShape {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

function makeSubscriptionEvent(type: string, overrides?: Record<string, unknown>): WebhookEventShape {
  return {
    id: `evt_${type}_1`,
    type,
    data: {
      object: {
        id: "sub_123",
        status: "active",
        customer: "cus_test123",
        cancel_at_period_end: false,
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        items: { data: [{ price: { id: "price_ext" } }] },
        ...overrides,
      },
    },
  }
}

function makeInvoiceEvent(type: string): WebhookEventShape {
  return {
    id: `evt_${type}_1`,
    type,
    data: { object: { customer: "cus_test123" } },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindWebhookEvent.mockResolvedValue(null)
  mockRecordWebhookEvent.mockResolvedValue(undefined as unknown as Awaited<ReturnType<typeof recordWebhookEvent>>)
  mockUpsertSubscription.mockResolvedValue({ id: "sub-1" } as Awaited<ReturnType<typeof upsertSubscription>>)
  mockUpdateOrgBillingStatus.mockResolvedValue(undefined)
  mockFindTenantSubscriptionFeatures.mockResolvedValue([])
  mockCreateSubscriptionFeatureSnapshot.mockResolvedValue(undefined)
  mockFindPlanFeatures.mockResolvedValue([])
  mockFindOrgByCustomerId.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationByCustomerId>>)
  mockFindPlanPriceById.mockResolvedValue(PLAN_PRICE as Awaited<ReturnType<typeof findPlanPriceById>>)
})

describe("handleStripeWebhook — idempotency", () => {
  it("skips processing when event already exists", async () => {
    mockFindWebhookEvent.mockResolvedValue({ id: "evt_1" } as Awaited<ReturnType<typeof findWebhookEvent>>)

    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_CREATED) as BillingWebhookEvent)

    expect(mockUpsertSubscription).not.toHaveBeenCalled()
    expect(mockRecordWebhookEvent).not.toHaveBeenCalled()
  })
})

describe("handleStripeWebhook — customer.subscription.created/updated", () => {
  it("upserts subscription and updates billing status on created", async () => {
    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_CREATED) as BillingWebhookEvent)

    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: ORG.id, externalSubscriptionId: "sub_123", status: "active" }),
    )
    expect(mockUpdateOrgBillingStatus).toHaveBeenCalledWith(ORG.id, "active", PLAN_PRICE.planId)
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })

  it("upserts subscription on updated event", async () => {
    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_UPDATED, { status: "past_due" }) as BillingWebhookEvent)

    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" }),
    )
    expect(mockUpdateOrgBillingStatus).toHaveBeenCalledWith(ORG.id, "past_due", PLAN_PRICE.planId)
  })

  it("skips when org not found for customer", async () => {
    mockFindOrgByCustomerId.mockResolvedValue(null)

    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_CREATED) as BillingWebhookEvent)

    expect(mockUpsertSubscription).not.toHaveBeenCalled()
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })

  it("skips when plan price not found", async () => {
    mockFindPlanPriceById.mockResolvedValue(null)

    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_CREATED) as BillingWebhookEvent)

    expect(mockUpsertSubscription).not.toHaveBeenCalled()
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })
})

describe("handleStripeWebhook — customer.subscription.deleted", () => {
  it("sets billing status to cancelled", async () => {
    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_DELETED) as BillingWebhookEvent)

    expect(mockUpdateOrgBillingStatus).toHaveBeenCalledWith(ORG.id, "cancelled")
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })

  it("skips when org not found", async () => {
    mockFindOrgByCustomerId.mockResolvedValue(null)

    await handleStripeWebhook(makeSubscriptionEvent(SUBSCRIPTION_DELETED) as BillingWebhookEvent)

    expect(mockUpdateOrgBillingStatus).not.toHaveBeenCalled()
  })
})

describe("handleStripeWebhook — invoice.payment_failed", () => {
  it("sets billing status to past_due", async () => {
    await handleStripeWebhook(makeInvoiceEvent("invoice.payment_failed") as BillingWebhookEvent)

    expect(mockUpdateOrgBillingStatus).toHaveBeenCalledWith(ORG.id, "past_due")
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })

  it("skips when org not found", async () => {
    mockFindOrgByCustomerId.mockResolvedValue(null)
    await handleStripeWebhook(makeInvoiceEvent("invoice.payment_failed") as BillingWebhookEvent)
    expect(mockUpdateOrgBillingStatus).not.toHaveBeenCalled()
  })
})

describe("handleStripeWebhook — invoice.payment_succeeded", () => {
  it("sets billing status to active", async () => {
    await handleStripeWebhook(makeInvoiceEvent("invoice.payment_succeeded") as BillingWebhookEvent)

    expect(mockUpdateOrgBillingStatus).toHaveBeenCalledWith(ORG.id, "active")
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })
})

describe("handleStripeWebhook — unknown event type", () => {
  it("records event but takes no action", async () => {
    await handleStripeWebhook({ id: "evt_unknown", type: "some.unknown.event", data: { object: {} } } as BillingWebhookEvent)

    expect(mockUpdateOrgBillingStatus).not.toHaveBeenCalled()
    expect(mockUpsertSubscription).not.toHaveBeenCalled()
    expect(mockRecordWebhookEvent).toHaveBeenCalledOnce()
  })
})

describe("retryFailedWebhookEvents", () => {
  it("returns zeros when no failed events", async () => {
    mockFindFailedWebhookEvents.mockResolvedValue([])

    const result = await retryFailedWebhookEvents()
    expect(result).toEqual({ retried: 0, succeeded: 0, failed: 0 })
  })

  it("retries each failed event and marks processed on success", async () => {
    const failedEvent = {
      id: "webhook-log-1",
      payload: makeSubscriptionEvent(SUBSCRIPTION_CREATED),
    }
    mockFindFailedWebhookEvents.mockResolvedValue([failedEvent] as unknown as Awaited<ReturnType<typeof findFailedWebhookEvents>>)
    mockMarkWebhookEventProcessed.mockResolvedValue(undefined)

    const result = await retryFailedWebhookEvents()

    expect(result).toEqual({ retried: 1, succeeded: 1, failed: 0 })
    expect(mockMarkWebhookEventProcessed).toHaveBeenCalledWith(failedEvent.id)
  })

  it("marks failed and counts error when retry throws", async () => {
    const failedEvent = {
      id: "webhook-log-2",
      payload: {
        id: "evt-retry-fail",
        type: SUBSCRIPTION_UPDATED,
        data: {
          object: {
            id: "sub_1",
            status: "active",
            customer: "cus_bad",
            cancel_at_period_end: false,
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            items: { data: [{ price: { id: "price_ext" } }] },
          },
        },
      },
    }
    mockFindFailedWebhookEvents.mockResolvedValue([failedEvent] as unknown as Awaited<ReturnType<typeof findFailedWebhookEvents>>)
    mockMarkWebhookEventFailed.mockResolvedValue(undefined)
    mockFindOrgByCustomerId.mockRejectedValue(new Error("DB error"))

    const result = await retryFailedWebhookEvents()

    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(0)
    expect(mockMarkWebhookEventFailed).toHaveBeenCalledWith(failedEvent.id, expect.any(String))
  })
})
