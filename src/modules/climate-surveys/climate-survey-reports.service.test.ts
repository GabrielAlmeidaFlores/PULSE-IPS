import { describe, it, expect, vi, beforeEach } from "vitest"
import { getClimateSurveyWaveReports } from "@/modules/climate-surveys/climate-survey-reports.service"
import {
  findClimateSurveyDispatchOrdinalRows,
  findClimateSurveyDispatchesPaginated,
  type ClimateSurveyDispatchWithConfig,
} from "@/modules/climate-surveys/climate-survey.repository"
import { getClimateSurveyMultipleDispatchDashboards } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import type { ClimateSurveyDispatchDashboardStats } from "@/modules/climate-surveys/climate-survey.types"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/climate-surveys/climate-survey-dashboard.service")

const TENANT_ID = "tenant-1"
const CONFIG_A = "config-a"
const CONFIG_B = "config-b"
const DATE_1 = new Date("2026-01-01T10:00:00Z")
const DATE_2 = new Date("2026-02-01T10:00:00Z")

function makeDispatch(id: string, configId: string, name: string, scheduledAt: Date): ClimateSurveyDispatchWithConfig {
  return {
    id,
    tenantId: TENANT_ID,
    climateSurveyConfigurationId: configId,
    scheduledAt,
    dispatchedAt: scheduledAt,
    adherenceCheckedAt: null,
    status: "available",
    source: "manual",
    signedLinkToken: null,
    createdAt: scheduledAt,
    climateSurveyConfiguration: {
      id: configId,
      tenantId: TENANT_ID,
      name,
      description: null,
      frequency: "once",
      scheduledDayOfMonth: null,
      dispatchTime: "09:00",
      respectEmployeeSchedule: false,
      tokenExpiryHours: 48,
      sendViaMessaging: true,
      sendViaSignedLink: false,
      isActive: true,
      createdAt: scheduledAt,
      updatedAt: scheduledAt,
      configDepartments: [
        {
          department: {
            id: "dept-1",
            tenantId: TENANT_ID,
            name: "Vendas",
            isActive: true,
            workStartTime: "09:00",
            workEndTime: "18:00",
            createdAt: scheduledAt,
            updatedAt: scheduledAt,
          },
        },
      ],
    },
    deptDispatches: [],
  }
}

function makeDashboard(id: string, overrides: Partial<ClimateSurveyDispatchDashboardStats> = {}): ClimateSurveyDispatchDashboardStats {
  return {
    id,
    status: "available",
    scheduledAt: DATE_1,
    dispatchedAt: DATE_1,
    configName: "Clima",
    frequency: "once",
    departments: [{ id: "dept-1", name: "Vendas" }],
    totalRecipients: 10,
    totalResponses: 8,
    notResponded: 2,
    adherenceRate: 0.8,
    avgScore: 4,
    favorabilityPercent: 70,
    weightedScorePercent: 72,
    enps: 30,
    enpsBreakdown: { promoters: 5, neutrals: 3, detractors: 2, total: 10, score: 30 },
    signedLinkToken: null,
    minRespondentsPercent: 40,
    requiredRespondents: 4,
    questions: [],
    dimensionScores: [],
    departmentScores: [],
    ...overrides,
  }
}

const mockFindDispatches = vi.mocked(findClimateSurveyDispatchesPaginated)
const mockFindOrdinals = vi.mocked(findClimateSurveyDispatchOrdinalRows)
const mockGetDashboards = vi.mocked(getClimateSurveyMultipleDispatchDashboards)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getClimateSurveyWaveReports", () => {
  it("numera as ondas por configuração e agrega adesão, favorabilidade e eNPS", async () => {
    mockFindDispatches.mockResolvedValue({
      items: [makeDispatch("d-a2", CONFIG_A, "Clima A", DATE_2), makeDispatch("d-a1", CONFIG_A, "Clima A", DATE_1)],
      total: 2,
    })
    mockFindOrdinals.mockResolvedValue([
      { id: "d-a1", climateSurveyConfigurationId: CONFIG_A, scheduledAt: DATE_1 },
      { id: "d-a2", climateSurveyConfigurationId: CONFIG_A, scheduledAt: DATE_2 },
    ])
    mockGetDashboards.mockResolvedValue([
      makeDashboard("d-a2", { totalRecipients: 20, totalResponses: 10, adherenceRate: 0.5, favorabilityPercent: 65, enps: 20 }),
      makeDashboard("d-a1", { favorabilityPercent: 70, enps: 30 }),
    ])

    const result = await getClimateSurveyWaveReports(TENANT_ID, { page: 1, pageSize: 10 })

    expect(result.total).toBe(2)
    expect(result.items[0]).toMatchObject({
      dispatchId: "d-a2",
      waveNumber: 2,
      configName: "Clima A",
      totalRecipients: 20,
      totalResponses: 10,
      adherencePercent: 50,
      favorabilityPercent: 65,
      enps: 20,
      departmentNames: ["Vendas"],
    })
    expect(result.items[1]).toMatchObject({ dispatchId: "d-a1", waveNumber: 1, adherencePercent: 80 })
  })

  it("numera ondas de configurações diferentes de forma independente", async () => {
    mockFindDispatches.mockResolvedValue({
      items: [makeDispatch("d-a1", CONFIG_A, "Clima A", DATE_1), makeDispatch("d-b1", CONFIG_B, "Clima B", DATE_1)],
      total: 2,
    })
    mockFindOrdinals.mockResolvedValue([
      { id: "d-a1", climateSurveyConfigurationId: CONFIG_A, scheduledAt: DATE_1 },
      { id: "d-b1", climateSurveyConfigurationId: CONFIG_B, scheduledAt: DATE_1 },
    ])
    mockGetDashboards.mockResolvedValue([makeDashboard("d-a1"), makeDashboard("d-b1")])

    const result = await getClimateSurveyWaveReports(TENANT_ID, { page: 1, pageSize: 10 })

    expect(result.items.find((item) => item.dispatchId === "d-a1")?.waveNumber).toBe(1)
    expect(result.items.find((item) => item.dispatchId === "d-b1")?.waveNumber).toBe(1)
  })
})
