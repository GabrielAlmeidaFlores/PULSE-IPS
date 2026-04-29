import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getPgrReviews,
  getPgrReviewsPaginated,
  getPgrReviewById,
  generatePgrReport,
  sendPgrReviewReminders,
  markPgrReviewAsReviewed,
  getPgrScoreDistributions,
} from "@/modules/pgr/pgr.service"
import {
  findPgrReviewsByTenant,
  findPgrReviewsByTenantPaginated,
  findPgrReviewById,
  findOrgWithDepartmentsForPgr,
  findDispatchesForPgr,
  findPgrReviewByTenantAndPeriod,
  createPgrReviewAtomic,
  findAllTenantsUpcomingPgrReviews,
  findExistingPgrAlert,
  createPgrAlert,
  findItemScoresForPeriod,
  updatePgrReviewStatus,
} from "@/modules/pgr/pgr.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"

vi.mock("@/modules/pgr/pgr.repository")
vi.mock("@/modules/billing/billing.service")

const mockFindReviewsByTenant = vi.mocked(findPgrReviewsByTenant)
const mockFindReviewsByTenantPaginated = vi.mocked(findPgrReviewsByTenantPaginated)
const mockFindReviewById = vi.mocked(findPgrReviewById)
const mockFindOrgWithDepts = vi.mocked(findOrgWithDepartmentsForPgr)
const mockFindDispatches = vi.mocked(findDispatchesForPgr)
const mockFindByTenantAndPeriod = vi.mocked(findPgrReviewByTenantAndPeriod)
const mockCreatePgrReviewAtomic = vi.mocked(createPgrReviewAtomic)
const mockFindUpcomingReviews = vi.mocked(findAllTenantsUpcomingPgrReviews)
const mockFindExistingPgrAlert = vi.mocked(findExistingPgrAlert)
const mockCreatePgrAlert = vi.mocked(createPgrAlert)
const mockFindItemScoresForPeriod = vi.mocked(findItemScoresForPeriod)
const mockUpdatePgrReviewStatus = vi.mocked(updatePgrReviewStatus)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)

const TENANT_ID = "tenant-1"
const DEPT_ID = "dept-1"
const PERIOD = "2026-04"

const DEPT = {
  id: DEPT_ID,
  name: "Engenharia",
  employees: [{ id: "e1" }, { id: "e2" }],
}

const QUESTION = {
  id: "q-1",
  text: "Como está seu nível de estresse?",
  order: 1,
  scoreDirection: "lower_is_better",
}

type PgrDispatch = Awaited<ReturnType<typeof findDispatchesForPgr>>[number]

function makeDispatch(month: number, responseCount: number): PgrDispatch {
  const responses = Array.from({ length: responseCount }, () => ({
    items: [{ questionId: "q-1", score: 3 }],
  }))
  return {
    id: `d-${month}`,
    dispatchedAt: new Date(`2026-0${month}-15T10:00:00Z`),
    totalRecipients: 10,
    healthSurveyConfiguration: {
      departmentId: DEPT_ID,
      questions: [QUESTION],
    },
    responses,
  } as PgrDispatch
}

const REVIEW_LIST_ITEM = {
  id: "pgr-1",
  tenantId: TENANT_ID,
  period: PERIOD,
  status: "generated",
  reviewedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  fileUrl: null,
  nextReviewAt: null,
  deptResults: [{ avgScore: 3.5, responseCount: 6 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindReviewsByTenant.mockResolvedValue([REVIEW_LIST_ITEM] as Awaited<ReturnType<typeof findPgrReviewsByTenant>>)
  mockFindReviewsByTenantPaginated.mockResolvedValue({ items: [REVIEW_LIST_ITEM], total: 1 } as Awaited<ReturnType<typeof findPgrReviewsByTenantPaginated>>)
  mockFindReviewById.mockResolvedValue(null)
  mockFindOrgWithDepts.mockResolvedValue({ departments: [DEPT] } as Awaited<ReturnType<typeof findOrgWithDepartmentsForPgr>>)
  mockFindDispatches.mockResolvedValue([makeDispatch(4, 6)] as Awaited<ReturnType<typeof findDispatchesForPgr>>)
  mockFindByTenantAndPeriod.mockResolvedValue(null)
  mockCreatePgrReviewAtomic.mockResolvedValue({} as Awaited<ReturnType<typeof createPgrReviewAtomic>>)
  mockFindUpcomingReviews.mockResolvedValue([] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)
  mockFindExistingPgrAlert.mockResolvedValue(null)
  mockCreatePgrAlert.mockResolvedValue(undefined)
  mockFindItemScoresForPeriod.mockResolvedValue([])
  mockUpdatePgrReviewStatus.mockResolvedValue({} as Awaited<ReturnType<typeof updatePgrReviewStatus>>)
  mockHasTenantPlanFeature.mockResolvedValue(true)
})

describe("getPgrReviews", () => {
  it("converte lista de reviews adicionando overallHealthIndex", async () => {
    const result = await getPgrReviews(TENANT_ID)

    expect(mockFindReviewsByTenant).toHaveBeenCalledWith(TENANT_ID)
    expect(result[0]).toHaveProperty("overallHealthIndex")
  })

  it("retorna overallHealthIndex null quando não há resultados por setor", async () => {
    mockFindReviewsByTenant.mockResolvedValue([
      { ...REVIEW_LIST_ITEM, deptResults: [] },
    ] as Awaited<ReturnType<typeof findPgrReviewsByTenant>>)

    const result = await getPgrReviews(TENANT_ID)

    expect(result[0]?.overallHealthIndex).toBeNull()
  })
})

describe("getPgrReviewsPaginated", () => {
  it("calcula skip corretamente e retorna items paginados com healthIndex", async () => {
    const result = await getPgrReviewsPaginated(TENANT_ID, { page: 2, pageSize: 5 })

    expect(mockFindReviewsByTenantPaginated).toHaveBeenCalledWith(TENANT_ID, 5, 5)
    expect(result.total).toBe(1)
    expect(result.items[0]).toHaveProperty("overallHealthIndex")
  })
})

describe("getPgrReviewById", () => {
  it("delega ao repository", async () => {
    await getPgrReviewById(TENANT_ID, "pgr-1")
    expect(mockFindReviewById).toHaveBeenCalledWith(TENANT_ID, "pgr-1")
  })
})

describe("generatePgrReport", () => {
  it("lança AppError quando não há dispatches no período", async () => {
    mockFindDispatches.mockResolvedValue([])

    await expect(generatePgrReport(TENANT_ID, PERIOD)).rejects.toMatchObject({
      code: "NO_DATA_FOR_PERIOD",
    })
    expect(mockCreatePgrReviewAtomic).not.toHaveBeenCalled()
  })

  it("lança AppError quando já existe relatório para o período", async () => {
    mockFindByTenantAndPeriod.mockResolvedValue({ id: "pgr-existe" } as Awaited<ReturnType<typeof findPgrReviewByTenantAndPeriod>>)

    await expect(generatePgrReport(TENANT_ID, PERIOD)).rejects.toMatchObject({
      code: "DUPLICATE_PGR_PERIOD",
    })
    expect(mockCreatePgrReviewAtomic).not.toHaveBeenCalled()
  })

  it("cria relatório PGR com dados do período", async () => {
    await generatePgrReport(TENANT_ID, PERIOD)

    expect(mockCreatePgrReviewAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, period: PERIOD }),
      expect.any(Array),
      expect.any(Array),
    )
  })

  it("ignora dispatches de outros meses ao gerar o relatório", async () => {
    mockFindDispatches.mockResolvedValue([
      makeDispatch(3, 6),
    ] as Awaited<ReturnType<typeof findDispatchesForPgr>>)

    await expect(generatePgrReport(TENANT_ID, "2026-04")).rejects.toMatchObject({
      code: "NO_DATA_FOR_PERIOD",
    })
  })
})

describe("sendPgrReviewReminders", () => {
  it("retorna zero quando não há revisões próximas", async () => {
    mockFindUpcomingReviews.mockResolvedValue([] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)

    const result = await sendPgrReviewReminders()

    expect(result).toEqual({ remindersCreated: 0 })
    expect(mockCreatePgrAlert).not.toHaveBeenCalled()
  })

  it("cria alerta para revisão próxima sem alerta existente e com feature pgr", async () => {
    mockFindUpcomingReviews.mockResolvedValue([
      { tenantId: TENANT_ID, nextReviewAt: new Date("2026-05-28") },
    ] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)
    mockHasTenantPlanFeature.mockResolvedValue(true)
    mockFindExistingPgrAlert.mockResolvedValue(null)

    const result = await sendPgrReviewReminders()

    expect(mockCreatePgrAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, type: "pgr_review_due" }),
    )
    expect(result).toEqual({ remindersCreated: 1 })
  })

  it("não cria alerta quando tenant não tem feature pgr", async () => {
    mockFindUpcomingReviews.mockResolvedValue([
      { tenantId: TENANT_ID, nextReviewAt: new Date() },
    ] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)
    mockHasTenantPlanFeature.mockResolvedValue(false)

    const result = await sendPgrReviewReminders()

    expect(mockCreatePgrAlert).not.toHaveBeenCalled()
    expect(result).toEqual({ remindersCreated: 0 })
  })

  it("não cria alerta duplicado quando já existe alerta pgr_review_due", async () => {
    mockFindUpcomingReviews.mockResolvedValue([
      { tenantId: TENANT_ID, nextReviewAt: new Date() },
    ] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)
    mockFindExistingPgrAlert.mockResolvedValue({ id: "alert-exists" } as Awaited<ReturnType<typeof findExistingPgrAlert>>)

    const result = await sendPgrReviewReminders()

    expect(mockCreatePgrAlert).not.toHaveBeenCalled()
    expect(result).toEqual({ remindersCreated: 0 })
  })
})

describe("markPgrReviewAsReviewed", () => {
  it("atualiza status para reviewed", async () => {
    await markPgrReviewAsReviewed(TENANT_ID, "pgr-1")
    expect(mockUpdatePgrReviewStatus).toHaveBeenCalledWith(TENANT_ID, "pgr-1", "reviewed")
  })
})

describe("getPgrScoreDistributions", () => {
  it("retorna distribuição vazia quando não há respostas no período", async () => {
    mockFindItemScoresForPeriod.mockResolvedValue([])

    const questionResult = {
      id: "qr-1",
      questionId: "q-1",
      questionText: "Estresse",
      questionOrder: 1,
      scoreDirection: "lower_is_better",
      departmentId: DEPT_ID,
      avgScore: 3,
      responseCount: 5,
    }

    const result = await getPgrScoreDistributions(TENANT_ID, PERIOD, [questionResult as never])

    expect(result[0]?.distribution).toHaveLength(5)
    expect(result[0]?.distribution.every((d) => d.count === 0)).toBe(true)
  })

  it("conta corretamente scores por questão e setor", async () => {
    mockFindItemScoresForPeriod.mockResolvedValue([
      { questionId: "q-1", departmentId: DEPT_ID, score: 3 },
      { questionId: "q-1", departmentId: DEPT_ID, score: 3 },
      { questionId: "q-1", departmentId: DEPT_ID, score: 5 },
    ] as Awaited<ReturnType<typeof findItemScoresForPeriod>>)

    const questionResult = {
      id: "qr-1",
      questionId: "q-1",
      questionText: "Estresse",
      questionOrder: 1,
      scoreDirection: "lower_is_better",
      departmentId: DEPT_ID,
      avgScore: 3,
      responseCount: 3,
    }

    const result = await getPgrScoreDistributions(TENANT_ID, PERIOD, [questionResult as never])

    const scoreThree = result[0]?.distribution.find((d) => d.score === 3)
    const scoreFive = result[0]?.distribution.find((d) => d.score === 5)
    expect(scoreThree?.count).toBe(2)
    expect(scoreFive?.count).toBe(1)
  })
})
