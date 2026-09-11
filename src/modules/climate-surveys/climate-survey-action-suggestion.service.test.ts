import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  acceptClimateSurveyActionSuggestion,
  generateClimateSurveyActionSuggestions,
  rejectClimateSurveyActionSuggestion,
  runClimateSurveyActionSuggestionGenerator,
} from "@/modules/climate-surveys/climate-survey-action-suggestion.service"
import {
  createClimateSurveyActionSuggestions,
  findClimateSurveyActionSuggestionById,
  findClimateSurveyActionSuggestionDimensions,
  markClimateSurveyActionSuggestionAccepted,
  markClimateSurveyActionSuggestionRejected,
} from "@/modules/climate-surveys/climate-survey-action-suggestion.repository"
import {
  getClimateSurveyDispatchDashboard,
  getClimateSurveyDispatchHeatmap,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { createClimateSurveyActionPlan } from "@/modules/climate-surveys/climate-survey-action-plan.service"
import { findAllTenantsClimateSurveyDispatchesForSuggestion } from "@/modules/climate-surveys/climate-survey.repository"
import type {
  ClimateSurveyDispatchDashboardStats,
  ClimateSurveyModuleDashboard,
} from "@/modules/climate-surveys/climate-survey.types"

vi.mock("@/modules/climate-surveys/climate-survey-action-suggestion.repository")
vi.mock("@/modules/climate-surveys/climate-survey-dashboard.service")
vi.mock("@/modules/climate-surveys/climate-survey-action-plan.service")
vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/climate-surveys/climate-survey-topic.service", () => ({
  getClimateSurveyTopicLabelMap: vi.fn().mockResolvedValue(new Map()),
}))

const TENANT_ID = "tenant-1"
const DISPATCH_ID = "dispatch-1"

function makeDashboard(overrides: Partial<ClimateSurveyDispatchDashboardStats> = {}): ClimateSurveyDispatchDashboardStats {
  return {
    id: DISPATCH_ID,
    status: "available",
    scheduledAt: new Date("2026-01-01T00:00:00Z"),
    dispatchedAt: new Date("2026-01-01T00:00:00Z"),
    configName: "Clima",
    frequency: "once",
    departments: [{ id: "dept-1", name: "Vendas" }],
    totalRecipients: 10,
    totalResponses: 8,
    notResponded: 2,
    adherenceRate: 0.8,
    avgScore: 3.5,
    favorabilityPercent: 60,
    weightedScorePercent: 60,
    enps: 10,
    enpsBreakdown: { promoters: 3, neutrals: 4, detractors: 1, total: 8, score: 10 },
    signedLinkToken: null,
    minRespondentsPercent: 40,
    requiredRespondents: 4,
    questions: [],
    dimensionScores: [
      { dimension: "recognition_reward", label: "Reconhecimento e Recompensa", avgScore: 3, favorabilityPercent: 58, weightedScorePercent: 58, enps: 0, questionCount: 2 },
      { dimension: "leadership_trust", label: "Confiança na Liderança", avgScore: 4, favorabilityPercent: 82, weightedScorePercent: 82, enps: 30, questionCount: 2 },
    ],
    departmentScores: [],
    ...overrides,
  }
}

function makeHeatmap(): ClimateSurveyModuleDashboard["heatmap"] {
  return {
    topics: [
      { dimension: "recognition_reward", label: "Reconhecimento e Recompensa" },
      { dimension: "leadership_trust", label: "Confiança na Liderança" },
    ],
    departments: [
      { id: "dept-1", name: "Vendas" },
      { id: "dept-2", name: "Operações" },
    ],
    cells: [
      { dimension: "recognition_reward", departmentId: "dept-1", favorabilityPercent: 55, band: "critical", responseCount: 5 },
      { dimension: "recognition_reward", departmentId: "dept-2", favorabilityPercent: 60, band: "attention", responseCount: 5 },
      { dimension: "leadership_trust", departmentId: "dept-1", favorabilityPercent: 90, band: "strong", responseCount: 5 },
      { dimension: "leadership_trust", departmentId: "dept-2", favorabilityPercent: 88, band: "strong", responseCount: 5 },
    ],
    departmentTotals: [],
    companyEnps: 10,
    companyScorePercent: 60,
  }
}

const mockFindDimensions = vi.mocked(findClimateSurveyActionSuggestionDimensions)
const mockCreateSuggestions = vi.mocked(createClimateSurveyActionSuggestions)
const mockFindById = vi.mocked(findClimateSurveyActionSuggestionById)
const mockMarkAccepted = vi.mocked(markClimateSurveyActionSuggestionAccepted)
const mockMarkRejected = vi.mocked(markClimateSurveyActionSuggestionRejected)
const mockGetDashboard = vi.mocked(getClimateSurveyDispatchDashboard)
const mockGetHeatmap = vi.mocked(getClimateSurveyDispatchHeatmap)
const mockCreatePlan = vi.mocked(createClimateSurveyActionPlan)
const mockFindDispatches = vi.mocked(findAllTenantsClimateSurveyDispatchesForSuggestion)

beforeEach(() => {
  vi.clearAllMocks()
  mockFindDimensions.mockResolvedValue([])
  mockCreateSuggestions.mockResolvedValue(undefined)
  mockGetDashboard.mockResolvedValue(makeDashboard())
  mockGetHeatmap.mockResolvedValue(makeHeatmap())
  mockCreatePlan.mockResolvedValue({ id: "plan-1" } as Awaited<ReturnType<typeof createClimateSurveyActionPlan>>)
})

describe("generateClimateSurveyActionSuggestions", () => {
  it("gera sugestão por tópico abaixo da meta, citando o número que a disparou", async () => {
    const created = await generateClimateSurveyActionSuggestions(TENANT_ID, DISPATCH_ID)

    expect(created).toBe(1)
    expect(mockCreateSuggestions).toHaveBeenCalledWith(
      TENANT_ID,
      [
        expect.objectContaining({
          dispatchId: DISPATCH_ID,
          dimension: "recognition_reward",
          why: "Reconhecimento e Recompensa fechou em 58%, 12 pontos abaixo da meta de 70%",
          where: "Vendas, Operações",
        }),
      ],
    )
  })

  it("não duplica sugestões de tópicos já processados", async () => {
    mockFindDimensions.mockResolvedValue(["recognition_reward"])

    const created = await generateClimateSurveyActionSuggestions(TENANT_ID, DISPATCH_ID)

    expect(created).toBe(0)
    expect(mockCreateSuggestions).not.toHaveBeenCalled()
  })

  it("retorna 0 quando a onda não existe", async () => {
    mockGetDashboard.mockResolvedValue(null)

    const created = await generateClimateSurveyActionSuggestions(TENANT_ID, DISPATCH_ID)

    expect(created).toBe(0)
    expect(mockCreateSuggestions).not.toHaveBeenCalled()
  })
})

describe("acceptClimateSurveyActionSuggestion", () => {
  const PENDING = {
    id: "sug-1",
    dispatchId: DISPATCH_ID,
    dimension: "recognition_reward",
    what: "Programa de reconhecimento",
    why: "Reconhecimento fechou em 58%",
    who: "RH",
    where: "Vendas",
    when: "90 dias",
    how: "Rituais",
    cost: null,
    status: "pending",
    rejectedReason: null,
    actionPlanId: null,
    createdAt: new Date(),
  }

  it("cria o plano de ação e marca a sugestão como aceita", async () => {
    mockFindById.mockResolvedValue(PENDING)

    await acceptClimateSurveyActionSuggestion(TENANT_ID, "sug-1", {
      what: "Programa de reconhecimento",
      why: "Reconhecimento fechou em 58%",
      who: "RH",
      where: "Vendas",
      when: "90 dias",
      how: "Rituais",
    }, "user-1")

    expect(mockCreatePlan).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        title: "Programa de reconhecimento",
        dimension: "recognition_reward",
        climateSurveyDispatchId: DISPATCH_ID,
      }),
      "user-1",
    )
    expect(mockMarkAccepted).toHaveBeenCalledWith(TENANT_ID, "sug-1", "plan-1", expect.objectContaining({ cost: null }))
  })

  it("lança AppError quando a sugestão não está pendente", async () => {
    mockFindById.mockResolvedValue({ ...PENDING, status: "accepted" })

    await expect(
      acceptClimateSurveyActionSuggestion(TENANT_ID, "sug-1", {
        what: "x", why: "x", who: "x", where: "x", when: "x", how: "x",
      }),
    ).rejects.toMatchObject({ code: "CLIMATE_SUGGESTION_NOT_PENDING" })
    expect(mockCreatePlan).not.toHaveBeenCalled()
  })
})

describe("rejectClimateSurveyActionSuggestion", () => {
  it("exige motivo da recusa", async () => {
    await expect(rejectClimateSurveyActionSuggestion(TENANT_ID, "sug-1", "  ")).rejects.toMatchObject({
      code: "CLIMATE_SUGGESTION_REASON_REQUIRED",
    })
    expect(mockMarkRejected).not.toHaveBeenCalled()
  })

  it("marca a sugestão como recusada com o motivo", async () => {
    mockFindById.mockResolvedValue({
      id: "sug-1",
      dispatchId: DISPATCH_ID,
      dimension: "recognition_reward",
      what: "x", why: "x", who: "x", where: "x", when: "x", how: "x",
      cost: null, status: "pending", rejectedReason: null, actionPlanId: null, createdAt: new Date(),
    })

    await rejectClimateSurveyActionSuggestion(TENANT_ID, "sug-1", "já tratado")

    expect(mockMarkRejected).toHaveBeenCalledWith(TENANT_ID, "sug-1", "já tratado")
  })
})

describe("runClimateSurveyActionSuggestionGenerator", () => {
  it("processa apenas ondas com a janela de resposta encerrada", async () => {
    const longAgo = new Date(Date.now() - 100 * 3_600_000)
    const recent = new Date(Date.now() - 1 * 3_600_000)
    mockFindDispatches.mockResolvedValue([
      { id: "closed", tenantId: TENANT_ID, dispatchedAt: longAgo, tokenExpiryHours: 48 },
      { id: "open", tenantId: TENANT_ID, dispatchedAt: recent, tokenExpiryHours: 48 },
    ])

    const result = await runClimateSurveyActionSuggestionGenerator()

    expect(result.closedWaves).toBe(1)
    expect(mockGetDashboard).toHaveBeenCalledTimes(1)
  })
})
