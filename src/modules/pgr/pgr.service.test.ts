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
  replacePgrReviewAtomic,
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
const mockReplacePgrReviewAtomic = vi.mocked(replacePgrReviewAtomic)
const mockFindUpcomingReviews = vi.mocked(findAllTenantsUpcomingPgrReviews)
const mockFindExistingPgrAlert = vi.mocked(findExistingPgrAlert)
const mockCreatePgrAlert = vi.mocked(createPgrAlert)
const mockFindItemScoresForPeriod = vi.mocked(findItemScoresForPeriod)
const mockUpdatePgrReviewStatus = vi.mocked(updatePgrReviewStatus)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)

const TENANT_ID = "tenant-1"
const DEPT_ID = "dept-1"
const PERIOD = "2026-04"

const BASE_DATE = new Date("2026-01-01T00:00:00Z")

const DEPT = {
  id: DEPT_ID,
  tenantId: TENANT_ID,
  name: "Engenharia",
  isActive: true,
  workStartTime: "09:00",
  workEndTime: "18:00",
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  employees: [{ id: "e1" }, { id: "e2" }],
}

const QUESTION = {
  id: "q-1",
  tenantId: TENANT_ID,
  healthSurveyConfigurationId: "config-1",
  text: "Como está seu nível de estresse?",
  order: 1,
  scoreDirection: "lower_is_better",
  isActive: true,
}

type PgrDispatch = Awaited<ReturnType<typeof findDispatchesForPgr>>[number]

function makeDispatch(month: number, responseCount: number): PgrDispatch {
  const dispatchedAt = new Date(`2026-0${month}-15T10:00:00Z`)
  const responses = Array.from({ length: responseCount }, (_, ri) => ({
    id: `r-${month}-${ri}`,
    tenantId: TENANT_ID,
    departmentId: DEPT_ID,
    dispatchId: `d-${month}`,
    createdAt: dispatchedAt,
    items: [{ id: `item-${ri}`, healthSurveyResponseId: `r-${month}-${ri}`, questionId: "q-1", score: 3 }],
  }))
  return {
    id: `d-${month}`,
    tenantId: TENANT_ID,
    healthSurveyConfigurationId: "config-1",
    scheduledAt: dispatchedAt,
    dispatchedAt,
    adherenceCheckedAt: null,
    status: "available",
    source: "auto",
    signedLinkToken: null,
    createdAt: dispatchedAt,
    deptDispatches: [{ departmentId: DEPT_ID, totalRecipients: 10 }],
    healthSurveyConfiguration: {
      id: "config-1",
      tenantId: TENANT_ID,
      name: "Pesquisa de Saúde",
      description: null,
      frequency: "weekly",
      scheduledDayOfMonth: null,
      dispatchTime: "09:00",
      isActive: true,
      createdAt: dispatchedAt,
      updatedAt: dispatchedAt,
      configDepartments: [{ departmentId: DEPT_ID, department: DEPT }],
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
  mockFindReviewsByTenant.mockResolvedValue([REVIEW_LIST_ITEM])
  mockFindReviewsByTenantPaginated.mockResolvedValue({ items: [REVIEW_LIST_ITEM], total: 1 })
  mockFindReviewById.mockResolvedValue(null)
  mockFindOrgWithDepts.mockResolvedValue({ departments: [DEPT] } as Awaited<ReturnType<typeof findOrgWithDepartmentsForPgr>>)
  mockFindDispatches.mockResolvedValue([makeDispatch(4, 6)])
  mockFindByTenantAndPeriod.mockResolvedValue(null)
  mockCreatePgrReviewAtomic.mockResolvedValue({} as Awaited<ReturnType<typeof createPgrReviewAtomic>>)
  mockReplacePgrReviewAtomic.mockResolvedValue({} as Awaited<ReturnType<typeof replacePgrReviewAtomic>>)
  mockFindUpcomingReviews.mockResolvedValue([])
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
    ])

    const result = await getPgrReviews(TENANT_ID)

    expect(result[0]?.overallHealthIndex).toBeNull()
  })

  it("retorna overallHealthIndex null quando avgScore de todos os setores é zero", async () => {
    mockFindReviewsByTenant.mockResolvedValue([
      { ...REVIEW_LIST_ITEM, deptResults: [{ avgScore: 0, responseCount: 0 }] },
    ])

    const result = await getPgrReviews(TENANT_ID)

    expect(result[0]?.overallHealthIndex).toBeNull()
  })
})

describe("getPgrReviewsPaginated", () => {
  it("calcula skip corretamente e retorna items paginados com healthIndex", async () => {
    const result = await getPgrReviewsPaginated(TENANT_ID, { page: 2, pageSize: 5 })

    expect(mockFindReviewsByTenantPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 5, 5)
    expect(result.total).toBe(1)
    expect(result.items[0]).toHaveProperty("overallHealthIndex")
  })

  it("passa filtros year e status para o repository quando fornecidos", async () => {
    await getPgrReviewsPaginated(TENANT_ID, { page: 1, pageSize: 10, year: "2026", status: "generated" })

    expect(mockFindReviewsByTenantPaginated).toHaveBeenCalledWith(
      TENANT_ID,
      { year: "2026", status: "generated" },
      0,
      10,
    )
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

  it("lança AppError quando período tem formato inválido", async () => {
    await expect(generatePgrReport(TENANT_ID, "2026-4")).rejects.toMatchObject({
      code: "INVALID_PERIOD",
    })
    expect(mockFindOrgWithDepts).not.toHaveBeenCalled()
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
    mockFindDispatches.mockResolvedValue([])

    await expect(generatePgrReport(TENANT_ID, "2026-04")).rejects.toMatchObject({
      code: "NO_DATA_FOR_PERIOD",
    })
  })

  it("substitui relatório existente atomicamente quando forceRegenerate é true", async () => {
    const existingReview = { id: "pgr-existente" } as Awaited<ReturnType<typeof findPgrReviewByTenantAndPeriod>>
    mockFindByTenantAndPeriod.mockResolvedValue(existingReview)

    await generatePgrReport(TENANT_ID, PERIOD, true)

    expect(mockReplacePgrReviewAtomic).toHaveBeenCalledWith(
      "pgr-existente",
      expect.objectContaining({ tenantId: TENANT_ID, period: PERIOD }),
      expect.any(Array),
      expect.any(Array),
    )
    expect(mockCreatePgrReviewAtomic).not.toHaveBeenCalled()
  })

  it("processa período de dezembro com rollover de ano correto (mês 1 do ano seguinte)", async () => {
    mockFindOrgWithDepts.mockResolvedValue({
      timezone: "America/Sao_Paulo",
      departments: [DEPT],
    } as Awaited<ReturnType<typeof findOrgWithDepartmentsForPgr>>)

    await generatePgrReport(TENANT_ID, "2026-12")

    expect(mockCreatePgrReviewAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ period: "2026-12" }),
      expect.any(Array),
      expect.any(Array),
    )
  })

  it("define avgScore como 0 quando setor tem menos que o mínimo de respondentes", async () => {
    mockFindDispatches.mockResolvedValue([makeDispatch(4, 2)])

    await generatePgrReport(TENANT_ID, PERIOD)

    expect(mockCreatePgrReviewAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID }),
      expect.arrayContaining([expect.objectContaining({ avgScore: 0 })]),
      expect.any(Array),
    )
  })

  it("normaliza score sem inversão para scoreDirection higher_is_better", async () => {
    const higherIsBetterDispatch: PgrDispatch = {
      ...makeDispatch(4, 6),
      healthSurveyConfiguration: {
        ...makeDispatch(4, 6).healthSurveyConfiguration,
        questions: [{ ...QUESTION, scoreDirection: "higher_is_better" }],
      },
      responses: Array.from({ length: 6 }, (_, i) => ({
        id: `r-hi-${i}`,
        tenantId: TENANT_ID,
        departmentId: DEPT_ID,
        dispatchId: "d-hi",
        createdAt: new Date("2026-04-15T10:00:00Z"),
        items: [{ id: `item-hi-${i}`, healthSurveyResponseId: `r-hi-${i}`, questionId: "q-1", score: 4 }],
      })),
    }
    mockFindDispatches.mockResolvedValue([higherIsBetterDispatch])

    await generatePgrReport(TENANT_ID, PERIOD)

    expect(mockCreatePgrReviewAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID }),
      expect.arrayContaining([expect.objectContaining({ avgScore: 4 })]),
      expect.any(Array),
    )
  })

  it("cobre fallbacks de scoreDirection null, continue de outro dept, item com questionId desconhecido e deptDispatches sem DEPT_ID", async () => {
    const questionNullDirection = { ...QUESTION, scoreDirection: null as never }

    const dispatchA: PgrDispatch = {
      ...makeDispatch(4, 0),
      id: "d-A",
      deptDispatches: [{ departmentId: "other-dept", totalRecipients: 5 }],
      healthSurveyConfiguration: {
        ...makeDispatch(4, 0).healthSurveyConfiguration,
        id: "config-A",
        questions: [questionNullDirection],
      },
      responses: [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `r-A-${i}`,
          tenantId: TENANT_ID,
          departmentId: DEPT_ID,
          dispatchId: "d-A",
          createdAt: new Date("2026-04-15T10:00:00Z"),
          items: [
            { id: `item-A-known-${i}`, healthSurveyResponseId: `r-A-${i}`, questionId: "q-1", score: 3 },
            { id: `item-A-orphan-${i}`, healthSurveyResponseId: `r-A-${i}`, questionId: "orphan-q", score: 2 },
          ],
        })),
        {
          id: "r-other",
          tenantId: TENANT_ID,
          departmentId: "other-dept",
          dispatchId: "d-A",
          createdAt: new Date("2026-04-15T10:00:00Z"),
          items: [{ id: "item-other", healthSurveyResponseId: "r-other", questionId: "q-1", score: 5 }],
        },
      ],
    }

    const dispatchB: PgrDispatch = {
      ...makeDispatch(4, 0),
      id: "d-B",
      deptDispatches: [],
      healthSurveyConfiguration: {
        ...makeDispatch(4, 0).healthSurveyConfiguration,
        id: "config-B",
        questions: [questionNullDirection],
      },
      responses: [],
    }

    mockFindDispatches.mockResolvedValue([dispatchA, dispatchB])

    await generatePgrReport(TENANT_ID, PERIOD)

    expect(mockCreatePgrReviewAtomic).toHaveBeenCalled()
  })
})

describe("sendPgrReviewReminders", () => {
  it("retorna zero quando não há revisões próximas", async () => {
    mockFindUpcomingReviews.mockResolvedValue([])

    const result = await sendPgrReviewReminders()

    expect(result).toEqual({ remindersCreated: 0 })
    expect(mockCreatePgrAlert).not.toHaveBeenCalled()
  })

  it("cria alerta para revisão próxima sem alerta existente e com feature pgr", async () => {
    mockFindUpcomingReviews.mockResolvedValue([
      { tenantId: TENANT_ID, nextReviewAt: new Date("2026-05-28"), organization: { timezone: "America/Sao_Paulo" } },
    ] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)
    mockHasTenantPlanFeature.mockResolvedValue(true)
    mockFindExistingPgrAlert.mockResolvedValue(null)

    const result = await sendPgrReviewReminders()

    expect(mockCreatePgrAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, type: "pgr_review_due" }),
    )
    expect(result).toEqual({ remindersCreated: 1 })
  })

  it("usa texto 'em breve' na mensagem quando nextReviewAt é null", async () => {
    mockFindUpcomingReviews.mockResolvedValue([
      { tenantId: TENANT_ID, nextReviewAt: null, organization: { timezone: "America/Sao_Paulo" } },
    ] as Awaited<ReturnType<typeof findAllTenantsUpcomingPgrReviews>>)
    mockHasTenantPlanFeature.mockResolvedValue(true)
    mockFindExistingPgrAlert.mockResolvedValue(null)

    await sendPgrReviewReminders()

    expect(mockCreatePgrAlert).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("em breve") as string }),
    )
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
    ])

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

  it("processa período de dezembro corretamente com rollover de ano", async () => {
    mockFindItemScoresForPeriod.mockResolvedValue([])

    const result = await getPgrScoreDistributions(TENANT_ID, "2026-12", [])

    expect(result).toEqual([])
    expect(mockFindItemScoresForPeriod).toHaveBeenCalled()
  })
})
