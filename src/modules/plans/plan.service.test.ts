import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createNewPlan,
  updatePlanPriceValue,
  addPriceToPlan,
  addDirectPriceToPlan,
  deletePlanById,
  getAllPlans,
  getAllPlansAdmin,
  getPlan,
  getPlanPriceWithPlan,
  updatePlanDetails,
  togglePlanActive,
  getAllPlansPaginated,
  getPlanFeatures,
  updatePlanFeatures,
} from "@/modules/plans/plan.service"
import {
  findPlanById,
  findPlanPriceById,
  createPlan,
  createPlanPrice,
  updatePlan,
  updatePlanPriceAmount,
  updatePlanPriceRecord,
  deletePlan,
  findAllPlans,
  findAllPlansIncludingInactive,
  findAllPlansPaginated,
  findPlanPriceWithPlan,
  setPlanFeatures,
  findPlanFeatures,
} from "@/modules/plans/plan.repository"
import { getBillingService } from "@/libs/integrations"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"

vi.mock("@/modules/plans/plan.repository")
vi.mock("@/libs/integrations")
vi.mock("@/env", () => ({ env: { BILLING_PROVIDER: "fake" } }))

const mockFindPlanById = vi.mocked(findPlanById)
const mockFindPlanPriceById = vi.mocked(findPlanPriceById)
const mockCreatePlan = vi.mocked(createPlan)
const mockCreatePlanPrice = vi.mocked(createPlanPrice)
const mockUpdatePlan = vi.mocked(updatePlan)
const mockUpdatePlanPriceAmount = vi.mocked(updatePlanPriceAmount)
const mockUpdatePlanPriceRecord = vi.mocked(updatePlanPriceRecord)
const mockDeletePlan = vi.mocked(deletePlan)
const mockGetBillingService = vi.mocked(getBillingService)
const mockSetPlanFeatures = vi.mocked(setPlanFeatures)
const mockFindPlanFeatures = vi.mocked(findPlanFeatures)
const mockFindAllPlansPaginated = vi.mocked(findAllPlansPaginated)

const PLAN = {
  id: "plan-1",
  name: "Starter",
  externalProductId: "prod_abc",
  maxEmployees: 50,
  description: "Starter plan",
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  features: [] as import("@/modules/plans/plan.types").PlanFeature[],
  prices: [] as import("@/modules/plans/plan.types").PlanPrice[],
}
const PLAN_PRICE = {
  id: "price-1",
  planId: "plan-1",
  priceInCents: 4900,
  interval: "month",
  currency: "brl",
  externalPriceId: "price_ext",
  isActive: true,
  createdAt: new Date(),
  plan: {
    id: "plan-1",
    name: "Starter",
    externalProductId: "prod_abc",
    maxEmployees: 50,
    description: "Starter plan",
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

const mockBillingCreateProduct = vi.fn().mockResolvedValue({ id: "prod_new" })
const mockBillingCreatePrice = vi.fn().mockResolvedValue({ id: "new_price_ext" })

const MOCK_BILLING_SERVICE = {
  createProduct: mockBillingCreateProduct,
  createPrice: mockBillingCreatePrice,
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
  createCustomer: vi.fn(),
  cancelSubscription: vi.fn(),
  constructWebhookEvent: vi.fn(),
} as IBillingService

beforeEach(() => {
  vi.clearAllMocks()
  mockCreatePlan.mockResolvedValue(PLAN as Awaited<ReturnType<typeof createPlan>>)
  mockCreatePlanPrice.mockResolvedValue(PLAN_PRICE)
  mockUpdatePlan.mockResolvedValue(PLAN as Awaited<ReturnType<typeof updatePlan>>)
  mockUpdatePlanPriceAmount.mockResolvedValue(PLAN_PRICE)
  mockUpdatePlanPriceRecord.mockResolvedValue(PLAN_PRICE)
  mockDeletePlan.mockResolvedValue(undefined)
  mockBillingCreateProduct.mockResolvedValue({ id: "prod_new" })
  mockBillingCreatePrice.mockResolvedValue({ id: "new_price_ext" })
  mockGetBillingService.mockReturnValue(MOCK_BILLING_SERVICE)
})

describe("createNewPlan", () => {
  it("creates product via billing service and persists plan", async () => {
    await createNewPlan({ name: "Pro", maxEmployees: 100 })

    expect(mockBillingCreateProduct).toHaveBeenCalledWith({ name: "Pro" })
    expect(mockCreatePlan).toHaveBeenCalledWith({ name: "Pro", maxEmployees: 100, externalProductId: "prod_new" })
  })

  it("passes description to createProduct when provided", async () => {
    await createNewPlan({ name: "Pro", maxEmployees: 100, description: "Pro plan" })

    expect(mockBillingCreateProduct).toHaveBeenCalledWith({ name: "Pro", description: "Pro plan" })
  })
})

describe("updatePlanPriceValue", () => {
  it("throws when price not found", async () => {
    mockFindPlanPriceById.mockResolvedValue(null)

    await expect(updatePlanPriceValue("price-x", 9900)).rejects.toMatchObject({ code: "PRICE_NOT_FOUND" })
  })

  it("creates new external price and updates record when has externalPriceId", async () => {
    mockFindPlanPriceById.mockResolvedValue(PLAN_PRICE as Awaited<ReturnType<typeof findPlanPriceById>>)

    await updatePlanPriceValue(PLAN_PRICE.id, 9900)

    expect(mockBillingCreatePrice).toHaveBeenCalledWith(
      expect.objectContaining({ externalProductId: PLAN.externalProductId, unitAmountInCents: 9900 }),
    )
    expect(mockUpdatePlanPriceRecord).toHaveBeenCalledWith(PLAN_PRICE.id, { priceInCents: 9900, externalPriceId: "new_price_ext" })
  })

  it("updates amount directly when no externalPriceId", async () => {
    mockFindPlanPriceById.mockResolvedValue({ ...PLAN_PRICE, externalPriceId: null } as Awaited<ReturnType<typeof findPlanPriceById>>)

    await updatePlanPriceValue(PLAN_PRICE.id, 9900)

    expect(mockUpdatePlanPriceAmount).toHaveBeenCalledWith(PLAN_PRICE.id, 9900)
    expect(mockUpdatePlanPriceRecord).not.toHaveBeenCalled()
  })
})

describe("addPriceToPlan", () => {
  it("throws when plan has no external product", async () => {
    mockFindPlanById.mockResolvedValue({ ...PLAN, externalProductId: null } as Awaited<ReturnType<typeof findPlanById>>)

    await expect(addPriceToPlan({ planId: "plan-1", unitAmountInCents: 9900, currency: "brl", interval: "month" })).rejects.toMatchObject({
      code: "PLAN_NO_PRODUCT",
    })
  })

  it("creates external price and persists plan price", async () => {
    mockFindPlanById.mockResolvedValue(PLAN as Awaited<ReturnType<typeof findPlanById>>)

    await addPriceToPlan({ planId: "plan-1", unitAmountInCents: 9900, currency: "brl", interval: "month" })

    expect(mockBillingCreatePrice).toHaveBeenCalledWith(
      expect.objectContaining({ externalProductId: PLAN.externalProductId, unitAmountInCents: 9900 }),
    )
    expect(mockCreatePlanPrice).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "plan-1", externalPriceId: "new_price_ext", priceInCents: 9900 }),
    )
  })
})

describe("addDirectPriceToPlan", () => {
  it("creates price via billing and persists when plan has external product", async () => {
    mockFindPlanById.mockResolvedValue(PLAN as Awaited<ReturnType<typeof findPlanById>>)
    mockBillingCreatePrice.mockResolvedValueOnce({ id: "price_direct" })

    await addDirectPriceToPlan({ planId: "plan-1", priceInCents: 4900, interval: "month" })

    expect(mockBillingCreatePrice).toHaveBeenCalledOnce()
    expect(mockCreatePlanPrice).toHaveBeenCalledWith(
      expect.objectContaining({ externalPriceId: "price_direct" }),
    )
  })

  it("creates price directly when plan has no external product", async () => {
    mockFindPlanById.mockResolvedValue({ ...PLAN, externalProductId: null } as Awaited<ReturnType<typeof findPlanById>>)

    await addDirectPriceToPlan({ planId: "plan-1", priceInCents: 4900, interval: "month" })

    expect(mockCreatePlanPrice).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "plan-1", priceInCents: 4900 }),
    )
  })
})

describe("deletePlanById", () => {
  it("throws when plan does not exist", async () => {
    mockFindPlanById.mockResolvedValue(null)

    await expect(deletePlanById("plan-1")).rejects.toMatchObject({ code: "PLAN_NOT_FOUND" })
    expect(mockDeletePlan).not.toHaveBeenCalled()
  })

  it("soft-deletes plan when it exists", async () => {
    mockFindPlanById.mockResolvedValue(PLAN as Awaited<ReturnType<typeof findPlanById>>)

    await deletePlanById("plan-1")

    expect(mockDeletePlan).toHaveBeenCalledWith("plan-1")
  })
})

describe("getAllPlans", () => {
  it("returns all active plans", async () => {
    vi.mocked(findAllPlans).mockResolvedValue([{ id: "p-1" }] as Awaited<ReturnType<typeof findAllPlans>>)
    const result = await getAllPlans()
    expect(result).toEqual([{ id: "p-1" }])
  })
})

describe("getAllPlansAdmin", () => {
  it("returns all plans including inactive ones", async () => {
    vi.mocked(findAllPlansIncludingInactive).mockResolvedValue([{ id: "p-1" }, { id: "p-2" }] as Awaited<ReturnType<typeof findAllPlansIncludingInactive>>)
    const result = await getAllPlansAdmin()
    expect(result).toHaveLength(2)
  })
})

describe("getPlan", () => {
  it("returns a single plan by id", async () => {
    vi.mocked(findPlanById).mockResolvedValue({ id: "p-1" } as Awaited<ReturnType<typeof findPlanById>>)
    const result = await getPlan("p-1")
    expect(result).toEqual({ id: "p-1" })
    expect(findPlanById).toHaveBeenCalledWith("p-1")
  })
})

describe("getPlanPriceWithPlan", () => {
  it("returns a plan price with its parent plan", async () => {
    vi.mocked(findPlanPriceWithPlan).mockResolvedValue({ id: "pp-1" } as Awaited<ReturnType<typeof findPlanPriceWithPlan>>)
    const result = await getPlanPriceWithPlan("pp-1")
    expect(result).toEqual({ id: "pp-1" })
  })
})

describe("updatePlanDetails", () => {
  it("updates plan fields and returns updated record", async () => {
    vi.mocked(updatePlan).mockResolvedValue({ id: "p-1", name: "New" } as Awaited<ReturnType<typeof updatePlan>>)
    const result = await updatePlanDetails("p-1", { name: "New" })
    expect(result).toEqual({ id: "p-1", name: "New" })
    expect(updatePlan).toHaveBeenCalledWith("p-1", { name: "New" })
  })
})

describe("togglePlanActive", () => {
  it("toggles plan active status and returns updated record", async () => {
    vi.mocked(updatePlan).mockResolvedValue({ id: "p-1", isActive: false } as Awaited<ReturnType<typeof updatePlan>>)
    const result = await togglePlanActive("p-1", false)
    expect(result).toEqual({ id: "p-1", isActive: false })
    expect(updatePlan).toHaveBeenCalledWith("p-1", { isActive: false })
  })
})

describe("getAllPlansPaginated", () => {
  it("calcula skip corretamente e repassa para o repository", async () => {
    const paged = { items: [], total: 0 } as Awaited<ReturnType<typeof findAllPlansPaginated>>
    mockFindAllPlansPaginated.mockResolvedValue(paged)

    await getAllPlansPaginated({ page: 3, pageSize: 10 })

    expect(mockFindAllPlansPaginated).toHaveBeenCalledWith(20, 10)
  })

  it("retorna resultado do repository diretamente", async () => {
    const paged = { items: [{ id: "p-1" }], total: 1 } as Awaited<ReturnType<typeof findAllPlansPaginated>>
    mockFindAllPlansPaginated.mockResolvedValue(paged)

    const result = await getAllPlansPaginated({ page: 1, pageSize: 10 })
    expect(result).toEqual(paged)
  })
})

describe("getPlanFeatures", () => {
  it("retorna as funcionalidades do plano pelo id", async () => {
    const features = ["action_plans", "pgr"] as Awaited<ReturnType<typeof findPlanFeatures>>
    mockFindPlanFeatures.mockResolvedValue(features)

    const result = await getPlanFeatures("plan-1")
    expect(result).toEqual(features)
    expect(mockFindPlanFeatures).toHaveBeenCalledWith("plan-1")
  })
})

describe("updatePlanFeatures", () => {
  it("lança AppError quando plano não existe", async () => {
    mockFindPlanById.mockResolvedValue(null)

    await expect(updatePlanFeatures({ planId: "plan-x", features: ["pgr"] })).rejects.toMatchObject({
      code: "PLAN_NOT_FOUND",
    })
    expect(mockSetPlanFeatures).not.toHaveBeenCalled()
  })

  it("persiste as funcionalidades quando plano existe", async () => {
    mockFindPlanById.mockResolvedValue(PLAN as Awaited<ReturnType<typeof findPlanById>>)
    mockSetPlanFeatures.mockResolvedValue(undefined)

    await updatePlanFeatures({ planId: "plan-1", features: ["action_plans", "pgr"] })

    expect(mockSetPlanFeatures).toHaveBeenCalledWith("plan-1", ["action_plans", "pgr"])
  })
})

describe("createNewPlan — com features", () => {
  it("chama setPlanFeatures quando features são fornecidas", async () => {
    mockSetPlanFeatures.mockResolvedValue(undefined)

    await createNewPlan({ name: "Enterprise", maxEmployees: 200, features: ["action_plans", "pgr"] })

    expect(mockSetPlanFeatures).toHaveBeenCalledWith(PLAN.id, ["action_plans", "pgr"])
  })

  it("não chama setPlanFeatures quando features estão ausentes", async () => {
    await createNewPlan({ name: "Starter", maxEmployees: 50 })

    expect(mockSetPlanFeatures).not.toHaveBeenCalled()
  })

  it("não chama setPlanFeatures quando features é array vazio", async () => {
    await createNewPlan({ name: "Starter", maxEmployees: 50, features: [] })

    expect(mockSetPlanFeatures).not.toHaveBeenCalled()
  })
})
