import { describe, it, expect, vi, beforeEach } from "vitest"
import { getGovernanceDashboard } from "@/modules/governance/governance.service"
import { getAlertStats } from "@/modules/alerts/alert.service"
import { countClimateSurveyActionPlanIndicators } from "@/modules/action-plans/action-plan.repository"
import { getClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { findClimateSurveyDispatchTimeline } from "@/modules/climate-surveys/climate-survey.repository"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import type { ClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey.types"
import type { WorkforceDashboard } from "@/modules/workforce/workforce.types"

vi.mock("@/modules/alerts/alert.service")
vi.mock("@/modules/action-plans/action-plan.repository")
vi.mock("@/modules/climate-surveys/climate-survey-dashboard.service")
vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/workforce/workforce.service")

const TENANT_ID = "tenant-1"

const PAST_DATE = new Date("2000-01-01T00:00:00Z")
const FUTURE_DATE = new Date("2099-01-01T00:00:00Z")

const CLIMATE_MODULE: ClimateSurveyModuleDashboard = {
  wave: {
    id: "wave-1",
    configName: "Pesquisa de Clima",
    scheduledAt: PAST_DATE,
    dispatchedAt: PAST_DATE,
    status: "available",
    departmentNames: [],
  },
  kpis: {
    adherencePercent: 80,
    totalResponses: 40,
    totalRecipients: 50,
    favorabilityPercent: 65,
    enps: 20,
    adherenceStatus: "above_goal",
    favorabilityStatus: "attention",
    enpsStatus: "above_goal",
  },
  corporateGoalPercent: 70,
  minRespondentsPercent: 40,
  requiredRespondents: 20,
  radar: [],
  evolution: [],
  enpsBreakdown: { promoters: 10, neutrals: 20, detractors: 10, total: 40, score: 20 },
  heatmap: { topics: [], departments: [], cells: [] },
  hasEnoughRespondents: true,
  funnel: {
    dispatchId: "wave-1",
    emailsSent: 0,
    emailsOpened: 0,
    emailsClicked: 0,
    openRatePercent: null,
    clickRatePercent: null,
    totalRecipients: 50,
    responseStarts: 40,
    responseCompletions: 40,
    startRatePercent: 80,
    completionRatePercent: 80,
    averageResponseTimeSeconds: null,
    abandonmentByQuestion: [],
  },
}

const WORKFORCE_DASHBOARD: WorkforceDashboard = {
  competencias: ["2026-08"],
  selectedCompetencia: "2026-08",
  kpis: {
    headcount: 10,
    admissions: 1,
    terminations: 1,
    turnoverPercent: 10,
    absenteeismPercent: 6,
    expectedHours: 1760,
    absentHours: 100,
  },
  departments: [],
  evolution: [],
}

const TIMELINE_ROWS = [
  { id: "w-completed", configName: "Clima", scheduledAt: PAST_DATE, dispatchedAt: PAST_DATE, status: "available" },
  { id: "w-late", configName: "Clima", scheduledAt: PAST_DATE, dispatchedAt: null, status: "scheduled" },
  { id: "w-scheduled", configName: "Clima", scheduledAt: FUTURE_DATE, dispatchedAt: null, status: "scheduled" },
  { id: "w-failed", configName: "Clima", scheduledAt: PAST_DATE, dispatchedAt: null, status: "failed" },
  { id: "w-cancelled", configName: "Clima", scheduledAt: PAST_DATE, dispatchedAt: null, status: "cancelled" },
]

const mockGetClimateModule = vi.mocked(getClimateSurveyModuleDashboard)
const mockGetAlertStats = vi.mocked(getAlertStats)
const mockCountActionPlans = vi.mocked(countClimateSurveyActionPlanIndicators)
const mockGetWorkforce = vi.mocked(getWorkforceDashboard)
const mockFindTimeline = vi.mocked(findClimateSurveyDispatchTimeline)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetClimateModule.mockResolvedValue(CLIMATE_MODULE)
  mockGetAlertStats.mockResolvedValue({ total: 5, unresolved: 3, criticalUnresolved: 1, resolved: 2 })
  mockCountActionPlans.mockResolvedValue({ completed: 4, inProgress: 2, overdue: 1 })
  mockGetWorkforce.mockResolvedValue(WORKFORCE_DASHBOARD)
  mockFindTimeline.mockResolvedValue(TIMELINE_ROWS)
})

describe("getGovernanceDashboard", () => {
  it("agrega clima, alertas, planos e pessoas", async () => {
    const result = await getGovernanceDashboard(TENANT_ID)

    expect(result.climate).toMatchObject({
      waveConfigName: "Pesquisa de Clima",
      adherencePercent: 80,
      favorabilityPercent: 65,
      enps: 20,
    })
    expect(result.alerts).toEqual({ unresolved: 3, criticalUnresolved: 1 })
    expect(result.actionPlans).toEqual({ completed: 4, inProgress: 2, overdue: 1 })
    expect(result.workforce).toEqual({
      competencia: "2026-08",
      headcount: 10,
      turnoverPercent: 10,
      absenteeismPercent: 6,
    })
  })

  it("resolve o status de cada onda do roadmap", async () => {
    const result = await getGovernanceDashboard(TENANT_ID)
    const byId = new Map(result.timeline.map((item) => [item.id, item.status]))

    expect(byId.get("w-completed")).toBe("completed")
    expect(byId.get("w-late")).toBe("late")
    expect(byId.get("w-scheduled")).toBe("scheduled")
    expect(byId.get("w-failed")).toBe("failed")
    expect(byId.get("w-cancelled")).toBe("cancelled")
  })

  it("retorna onda nula quando não há pesquisa de clima", async () => {
    mockGetClimateModule.mockResolvedValue({ ...CLIMATE_MODULE, wave: null })

    const result = await getGovernanceDashboard(TENANT_ID)

    expect(result.climate.waveConfigName).toBeNull()
    expect(result.climate.waveScheduledAt).toBeNull()
  })
})
