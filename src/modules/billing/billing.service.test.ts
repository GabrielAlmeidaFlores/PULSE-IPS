import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCheckoutSession, getBillingPortalUrl, getSubscription, getTenantPlanFeatures, hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { findOrganizationRequired, updateOrganizationBillingStatus } from "@/modules/organizations/organization.repository"
import { findActiveSubscription, upsertSubscription, findPlanPriceForProvisioning, findTenantSubscriptionFeatures, createSubscriptionFeatureSnapshot } from "@/modules/billing/billing.repository"
import { findPlanFeatures } from "@/modules/plans/plan.repository"
import { getBillingService } from "@/libs/integrations"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"

vi.mock("@/modules/billing/billing.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/plans/plan.repository")
vi.mock("@/libs/integrations")
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    BILLING_PROVIDER: "fake",
    MESSAGING_PROVIDER: "console",
    EMAIL_PROVIDER: "console",
  },
}))

const mockFindOrgRequired = vi.mocked(findOrganizationRequired)
const mockUpdateOrgBillingStatus = vi.mocked(updateOrganizationBillingStatus)
const mockFindActiveSubscription = vi.mocked(findActiveSubscription)
const mockUpsertSubscription = vi.mocked(upsertSubscription)
const mockFindPlanPriceForProvisioning = vi.mocked(findPlanPriceForProvisioning)
const mockFindTenantSubscriptionFeatures = vi.mocked(findTenantSubscriptionFeatures)
const mockCreateSubscriptionFeatureSnapshot = vi.mocked(createSubscriptionFeatureSnapshot)
const mockFindPlanFeatures = vi.mocked(findPlanFeatures)
const mockGetBillingService = vi.mocked(getBillingService)

const mockBillingCreateProduct = vi.fn().mockResolvedValue({ id: "prod_new" })
const mockBillingCreatePrice = vi.fn().mockResolvedValue({ id: "price_new" })
const mockBillingCreateCheckoutSession = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session" })
const mockBillingCreateBillingPortalSession = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" })
const mockBillingCreateCustomer = vi.fn().mockResolvedValue({ id: "cus_new" })
const mockBillingCancelSubscription = vi.fn().mockResolvedValue(undefined)
const mockBillingConstructWebhookEvent = vi.fn().mockReturnValue({ id: "", type: "", data: { object: {} } })

const MOCK_BILLING_SERVICE = {
  createProduct: mockBillingCreateProduct,
  createPrice: mockBillingCreatePrice,
  createCheckoutSession: mockBillingCreateCheckoutSession,
  createBillingPortalSession: mockBillingCreateBillingPortalSession,
  createCustomer: mockBillingCreateCustomer,
  cancelSubscription: mockBillingCancelSubscription,
  constructWebhookEvent: mockBillingConstructWebhookEvent,
} as IBillingService

const ORG = { id: "org-1", slug: "acme", externalCustomerId: "cus_test123", planId: null }
const PLAN_PRICE = {
  id: "price-1",
  externalPriceId: "price_ext",
  planId: "plan-1",
  priceInCents: 5000,
  interval: "monthly",
  plan: { name: "Starter", maxEmployees: 50 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateOrgBillingStatus.mockResolvedValue(undefined)
  mockUpsertSubscription.mockResolvedValue({ id: "sub-1" } as Awaited<ReturnType<typeof upsertSubscription>>)
  mockFindTenantSubscriptionFeatures.mockResolvedValue([])
  mockCreateSubscriptionFeatureSnapshot.mockResolvedValue(undefined)
  mockFindPlanFeatures.mockResolvedValue([])
  mockBillingCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/session" })
  mockBillingCreateBillingPortalSession.mockResolvedValue({ url: "https://billing.stripe.com/portal" })
  mockGetBillingService.mockReturnValue(MOCK_BILLING_SERVICE)
})

describe("createCheckoutSession", () => {
  it("throws when org has no billing customer", async () => {
    mockFindOrgRequired.mockResolvedValue({ ...ORG, externalCustomerId: null } as Awaited<ReturnType<typeof findOrganizationRequired>>)

    await expect(createCheckoutSession("org-1", "price_ext")).rejects.toMatchObject({
      code: "NO_BILLING_CUSTOMER",
    })
  })

  it("returns checkout URL from billing service", async () => {
    mockFindOrgRequired.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationRequired>>)

    const url = await createCheckoutSession("org-1", "price_ext")

    expect(url).toBe("https://checkout.stripe.com/session")
    expect(mockBillingCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ externalPriceId: "price_ext", externalCustomerId: ORG.externalCustomerId }),
    )
  })

  it("provisions subscription automatically for fake adapter (url === successUrl)", async () => {
    mockFindOrgRequired.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationRequired>>)
    const successUrl = "http://localhost:3000/billing?success=true"
    mockBillingCreateCheckoutSession.mockResolvedValueOnce({ url: successUrl })
    mockFindPlanPriceForProvisioning.mockResolvedValue(PLAN_PRICE as Awaited<ReturnType<typeof findPlanPriceForProvisioning>>)

    await createCheckoutSession("org-1", "price_ext")

    expect(mockUpsertSubscription).toHaveBeenCalledOnce()
    expect(mockUpdateOrgBillingStatus).toHaveBeenCalledWith("org-1", "active", PLAN_PRICE.planId)
  })

  it("does not provision when fake adapter returns no plan price", async () => {
    mockFindOrgRequired.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationRequired>>)
    const successUrl = "http://localhost:3000/billing?success=true"
    mockBillingCreateCheckoutSession.mockResolvedValueOnce({ url: successUrl })
    mockFindPlanPriceForProvisioning.mockResolvedValue(null)

    await createCheckoutSession("org-1", "price_ext")

    expect(mockUpsertSubscription).not.toHaveBeenCalled()
  })

  it("uses custom successUrl and cancelUrl when provided", async () => {
    mockFindOrgRequired.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationRequired>>)
    mockBillingCreateCheckoutSession.mockResolvedValueOnce({ url: "https://custom-success.com" })

    await createCheckoutSession("org-1", "price_ext", {
      successUrl: "https://custom-success.com",
      cancelUrl: "https://custom-cancel.com",
    })

    expect(mockBillingCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ successUrl: "https://custom-success.com", cancelUrl: "https://custom-cancel.com" }),
    )
  })
})

describe("getBillingPortalUrl", () => {
  it("throws when org has no billing customer", async () => {
    mockFindOrgRequired.mockResolvedValue({ ...ORG, externalCustomerId: null } as Awaited<ReturnType<typeof findOrganizationRequired>>)

    await expect(getBillingPortalUrl("org-1")).rejects.toMatchObject({
      code: "NO_BILLING_CUSTOMER",
    })
  })

  it("returns portal URL from billing service", async () => {
    mockFindOrgRequired.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationRequired>>)

    const url = await getBillingPortalUrl("org-1")

    expect(url).toBe("https://billing.stripe.com/portal")
    expect(mockBillingCreateBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({ externalCustomerId: ORG.externalCustomerId }),
    )
  })
})

describe("getSubscription", () => {
  it("returns the active subscription for the given tenant", async () => {
    const sub = { id: "sub-1", tenantId: "org-1", status: "active" }
    mockFindActiveSubscription.mockResolvedValue(sub as Awaited<ReturnType<typeof findActiveSubscription>>)

    const result = await getSubscription("org-1")
    expect(result).toEqual(sub)
    expect(mockFindActiveSubscription).toHaveBeenCalledWith("org-1")
  })
})

describe("getTenantPlanFeatures", () => {
  it("retorna lista de features da assinatura do tenant", async () => {
    mockFindTenantSubscriptionFeatures.mockResolvedValue(["action_plans", "pgr"] as Awaited<ReturnType<typeof findTenantSubscriptionFeatures>>)

    const result = await getTenantPlanFeatures("org-1")

    expect(mockFindTenantSubscriptionFeatures).toHaveBeenCalledWith("org-1")
    expect(result).toEqual(["action_plans", "pgr"])
  })
})

describe("hasTenantPlanFeature", () => {
  it("retorna true quando tenant tem a feature", async () => {
    mockFindTenantSubscriptionFeatures.mockResolvedValue(["action_plans", "documents"] as Awaited<ReturnType<typeof findTenantSubscriptionFeatures>>)

    const result = await hasTenantPlanFeature("org-1", "action_plans")

    expect(result).toBe(true)
  })

  it("retorna false quando tenant não tem a feature", async () => {
    mockFindTenantSubscriptionFeatures.mockResolvedValue(["action_plans"] as Awaited<ReturnType<typeof findTenantSubscriptionFeatures>>)

    const result = await hasTenantPlanFeature("org-1", "pgr")

    expect(result).toBe(false)
  })
})
