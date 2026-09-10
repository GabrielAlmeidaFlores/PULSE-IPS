import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getClimateSurveyWaveComparison,
  listClimateSurveyWaveOptions,
} from "@/modules/climate-surveys/climate-survey-comparison.service"
import { findClimateSurveyWaveOptions } from "@/modules/climate-surveys/climate-survey.repository"
import { getClimateSurveyMultipleDispatchDashboards } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { countClimateSurveyActionPlansByDispatch } from "@/modules/action-plans/action-plan.repository"
import type { ClimateSurveyDispatchDashboardStats } from "@/modules/climate-surveys/climate-survey.types"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/climate-surveys/climate-survey-dashboard.service")
vi.mock("@/modules/action-plans/action-plan.repository")

const TENANT_ID = "tenant-1"

const BASE_DATE = new Date("2026-01-01T00:00:00Z")
const RECENT_DATE = new Date("2026-04-01T00:00:00Z")

const WAVE_OPTION_RECENT = { id: "d-2", configName: "Clima", scheduledAt: RECENT_DATE, dispatchedAt: RECENT_DATE }
const WAVE_OPTION_OLD = { id: "d-1", configName: "Clima", scheduledAt: BASE_DATE, dispatchedAt: BASE_DATE }

const WAVE_OPTIONS = [WAVE_OPTION_RECENT, WAVE_OPTION_OLD]

function makeDashboardStats(
  overrides: Partial<ClimateSurveyDispatchDashboardStats> & { id: string },
): ClimateSurveyDispatchDashboardStats {
  return {
    status: "available",
    scheduledAt: BASE_DATE,
    dispatchedAt: BASE_DATE,
    configName: "Clima",
    frequency: "quarterly",
    departments: [],
    totalRecipients: 10,
    totalResponses: 8,
    notResponded: 2,
    adherenceRate: 0.7,
    avgScore: 3.5,
    favorabilityPercent: 50,
    weightedScorePercent: 55,
    enps: 0,
    enpsBreakdown: { promoters: 3, neutrals: 4, detractors: 1, total: 8, score: 0 },
    signedLinkToken: null,
    minRespondentsPercent: 40,
    requiredRespondents: 4,
    questions: [],
    dimensionScores: [],
    departmentScores: [],
    ...overrides,
  }
}

const BASE_STATS = makeDashboardStats({
  id: "d-1",
  dimensionScores: [
    {
      dimension: "leadership_trust",
      label: "Liderança",
      avgScore: 3.5,
      favorabilityPercent: 50,
      weightedScorePercent: 55,
      enps: 0,
      questionCount: 2,
    },
  ],
})

const COMPARE_STATS = makeDashboardStats({
  id: "d-2",
  adherenceRate: 0.8,
  favorabilityPercent: 65,
  weightedScorePercent: 70,
  enps: 20,
  dimensionScores: [
    {
      dimension: "leadership_trust",
      label: "Liderança",
      avgScore: 4,
      favorabilityPercent: 65,
      weightedScorePercent: 70,
      enps: 20,
      questionCount: 2,
    },
  ],
})

const mockFindWaveOptions = vi.mocked(findClimateSurveyWaveOptions)
const mockGetMultipleDashboards = vi.mocked(getClimateSurveyMultipleDispatchDashboards)
const mockCountActionPlans = vi.mocked(countClimateSurveyActionPlansByDispatch)

beforeEach(() => {
  vi.clearAllMocks()
  mockFindWaveOptions.mockResolvedValue(WAVE_OPTIONS)
  mockGetMultipleDashboards.mockResolvedValue([BASE_STATS, COMPARE_STATS])
  mockCountActionPlans.mockResolvedValue({ total: 3, open: 1, inProgress: 1, completed: 1 })
})

describe("listClimateSurveyWaveOptions", () => {
  it("retorna as ondas disponíveis do tenant", async () => {
    const options = await listClimateSurveyWaveOptions(TENANT_ID)
    expect(options).toEqual(WAVE_OPTIONS)
  })
})

describe("getClimateSurveyWaveComparison", () => {
  it("compara as duas ondas mais recentes por padrão e calcula os deltas", async () => {
    const result = await getClimateSurveyWaveComparison(TENANT_ID)

    expect(result.comparison).not.toBeNull()
    if (result.comparison === null) return

    expect(result.comparison.base.id).toBe("d-1")
    expect(result.comparison.compare.id).toBe("d-2")

    const byKey = new Map(result.comparison.metrics.map((metric) => [metric.key, metric]))
    expect(byKey.get("adherence")).toMatchObject({ baseValue: 70, compareValue: 80, delta: 10 })
    expect(byKey.get("favorability")).toMatchObject({ baseValue: 50, compareValue: 65, delta: 15 })
    expect(byKey.get("score")).toMatchObject({ baseValue: 55, compareValue: 70, delta: 15 })
    expect(byKey.get("enps")).toMatchObject({ baseValue: 0, compareValue: 20, delta: 20 })

    expect(result.comparison.topics[0]).toMatchObject({
      dimension: "leadership_trust",
      baseScorePercent: 55,
      compareScorePercent: 70,
      delta: 15,
    })
    expect(result.comparison.actionPlans).toEqual({ total: 3, open: 1, inProgress: 1, completed: 1 })
  })

  it("usa as ondas informadas por parâmetro", async () => {
    const result = await getClimateSurveyWaveComparison(TENANT_ID, "d-1", "d-2")
    expect(result.comparison?.base.id).toBe("d-1")
    expect(result.comparison?.compare.id).toBe("d-2")
  })

  it("retorna comparação nula quando há menos de duas ondas", async () => {
    mockFindWaveOptions.mockResolvedValue([WAVE_OPTION_RECENT])
    const result = await getClimateSurveyWaveComparison(TENANT_ID)
    expect(result.comparison).toBeNull()
    expect(result.baseId).toBeNull()
    expect(mockGetMultipleDashboards).not.toHaveBeenCalled()
  })

  it("retorna comparação nula quando a mesma onda é selecionada", async () => {
    const result = await getClimateSurveyWaveComparison(TENANT_ID, "d-1", "d-1")
    expect(result.comparison).toBeNull()
    expect(result.baseId).toBe("d-1")
    expect(result.compareId).toBe("d-1")
    expect(mockGetMultipleDashboards).not.toHaveBeenCalled()
  })

  it("ignora ids inválidos e usa o padrão", async () => {
    const result = await getClimateSurveyWaveComparison(TENANT_ID, "inexistente", "inexistente")
    expect(result.comparison?.base.id).toBe("d-1")
    expect(result.comparison?.compare.id).toBe("d-2")
  })

  it("retorna comparação nula quando uma das ondas não tem dashboard", async () => {
    mockGetMultipleDashboards.mockResolvedValue([BASE_STATS])

    const result = await getClimateSurveyWaveComparison(TENANT_ID, "d-1", "d-2")

    expect(result.comparison).toBeNull()
    expect(result.baseId).toBe("d-1")
    expect(result.compareId).toBe("d-2")
  })
})
