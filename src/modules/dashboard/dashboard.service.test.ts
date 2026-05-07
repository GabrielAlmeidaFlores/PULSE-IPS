import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getDashboardData,
  getDeptHealthSummary,
  getAvailableQuestions,
} from "@/modules/dashboard/dashboard.service"
import {
  findDispatchesWithData,
  findDeptDispatchesWithData,
  findDeptActiveAlerts,
  findUniqueQuestions,
  countActiveEmployees,
  countTotalResponses,
  countActiveAlerts,
  findActiveDepartments,
  findOrganizationTimezone,
  type DispatchWithData,
} from "@/modules/dashboard/dashboard.repository"

vi.mock("@/modules/dashboard/dashboard.repository")

const mockFindDispatchesWithData = vi.mocked(findDispatchesWithData)
const mockFindDeptDispatchesWithData = vi.mocked(findDeptDispatchesWithData)
const mockFindDeptActiveAlerts = vi.mocked(findDeptActiveAlerts)
const mockFindUniqueQuestions = vi.mocked(findUniqueQuestions)
const mockCountActiveEmployees = vi.mocked(countActiveEmployees)
const mockCountTotalResponses = vi.mocked(countTotalResponses)
const mockCountActiveAlerts = vi.mocked(countActiveAlerts)
const mockFindActiveDepartments = vi.mocked(findActiveDepartments)
const mockFindOrganizationTimezone = vi.mocked(findOrganizationTimezone)

const TENANT_ID = "tenant-1"
const DEPT_ID = "dept-1"
const DEPT_NAME = "Engenharia"

const BASE_DATE = new Date("2026-01-01T12:00:00Z")

const DEPT_FIXTURE = {
  id: DEPT_ID,
  tenantId: TENANT_ID,
  name: DEPT_NAME,
  isActive: true,
  workStartTime: "09:00",
  workEndTime: "18:00",
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
}

const CONFIG_FIXTURE = {
  id: "config-1",
  tenantId: TENANT_ID,
  departmentId: DEPT_ID,
  name: "Pesquisa de Saúde",
  description: null,
  frequency: "weekly",
  scheduledDayOfMonth: null,
  workStartTime: "09:00",
  workEndTime: "18:00",
  isActive: true,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  department: DEPT_FIXTURE,
}

function makeResponse(dispatchId: string, index: number): DispatchWithData["responses"][number] {
  return {
    id: `response-${index}`,
    tenantId: TENANT_ID,
    dispatchId,
    createdAt: BASE_DATE,
    items: [
      {
        id: `item-${index}`,
        healthSurveyResponseId: `response-${index}`,
        questionId: "q-1",
        score: 4,
        question: { id: "q-1", text: "Estresse", order: 1, scoreDirection: "lower_is_better" },
      },
    ],
  }
}

function makeDispatch(daysAgo: number, responseCount: number): DispatchWithData {
  const dispatchedAt = new Date()
  dispatchedAt.setDate(dispatchedAt.getDate() - daysAgo)
  const dispatchId = `dispatch-${daysAgo}`

  return {
    id: dispatchId,
    tenantId: TENANT_ID,
    healthSurveyConfigurationId: "config-1",
    scheduledAt: dispatchedAt,
    dispatchedAt,
    adherenceCheckedAt: null,
    status: "available",
    totalRecipients: 10,
    totalResponses: responseCount,
    signedLinkToken: null,
    createdAt: dispatchedAt,
    healthSurveyConfiguration: CONFIG_FIXTURE,
    responses: Array.from({ length: responseCount }, (_, i) => makeResponse(dispatchId, i)),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindDispatchesWithData.mockResolvedValue([])
  mockFindDeptDispatchesWithData.mockResolvedValue([])
  mockFindDeptActiveAlerts.mockResolvedValue([])
  mockFindUniqueQuestions.mockResolvedValue([])
  mockCountActiveEmployees.mockResolvedValue(0)
  mockCountTotalResponses.mockResolvedValue(0)
  mockCountActiveAlerts.mockResolvedValue(0)
  mockFindActiveDepartments.mockResolvedValue([])
  mockFindOrganizationTimezone.mockResolvedValue("America/Sao_Paulo")
})

describe("getDashboardData — KPIs", () => {
  it("retorna healthIndex null quando não há dispatches", async () => {
    const result = await getDashboardData(TENANT_ID)

    expect(result.kpis.healthIndex).toBeNull()
    expect(result.overallTrend).toHaveLength(0)
    expect(result.deptCards).toHaveLength(0)
  })

  it("retorna totais de employees, responses e alerts dos repositórios", async () => {
    mockCountActiveEmployees.mockResolvedValue(42)
    mockCountTotalResponses.mockResolvedValue(150)
    mockCountActiveAlerts.mockResolvedValue(3)

    const result = await getDashboardData(TENANT_ID)

    expect(result.kpis.totalEmployees).toBe(42)
    expect(result.kpis.totalResponses).toBe(150)
    expect(result.kpis.activeAlerts).toBe(3)
  })

  it("retorna healthIndex null quando total de respostas recentes < 5 (MINIMUM_RESPONDENTS)", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 4)])

    const result = await getDashboardData(TENANT_ID)

    expect(result.kpis.healthIndex).toBeNull()
  })

  it("calcula healthIndex quando há respostas suficientes nos últimos 30 dias", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])

    const result = await getDashboardData(TENANT_ID)

    expect(result.kpis.healthIndex).not.toBeNull()
    expect(result.kpis.healthIndex).toBeGreaterThan(0)
    expect(result.kpis.healthIndex).toBeLessThanOrEqual(100)
  })

  it("retorna healthIndex null quando filtro de questão não corresponde a nenhum item (sem NaN)", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])

    const result = await getDashboardData(TENANT_ID, [999])

    expect(result.kpis.healthIndex).toBeNull()
    expect(Number.isNaN(result.kpis.healthIndex)).toBe(false)
  })
})

describe("getDashboardData — gráficos", () => {
  it("gera overallTrend com 0 avg quando mês tem menos de 5 respondentes", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 3)])

    const result = await getDashboardData(TENANT_ID)

    const hasZeroAvg = result.overallTrend.some((p) => p.avg === 0)
    expect(hasZeroAvg).toBe(true)
  })

  it("constrói deptCards para cada setor presente nos dispatches", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])
    mockFindActiveDepartments.mockResolvedValue([{ id: DEPT_ID, name: DEPT_NAME }])

    const result = await getDashboardData(TENANT_ID)

    expect(result.deptCards).toHaveLength(1)
    expect(result.deptCards[0]?.dept).toBe(DEPT_NAME)
  })

  it("retorna trend stable quando só há um mês de dados", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(10, 6)])
    mockFindActiveDepartments.mockResolvedValue([{ id: DEPT_ID, name: DEPT_NAME }])

    const result = await getDashboardData(TENANT_ID)

    expect(result.deptCards[0]?.trend).toBe("stable")
    expect(result.deptCards[0]?.prevAvg).toBeNull()
  })

  it("inclui scores da questão quando selectedOrders contém a ordem correspondente", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])

    const withFilter = await getDashboardData(TENANT_ID, [1])
    const withoutFilter = await getDashboardData(TENANT_ID, [])

    expect(withFilter.kpis.healthIndex).not.toBeNull()
    expect(withoutFilter.kpis.healthIndex).not.toBeNull()
  })
})

describe("getDeptHealthSummary", () => {
  it("retorna adherenceRate null quando não há recipients", async () => {
    mockFindDeptDispatchesWithData.mockResolvedValue([])

    const result = await getDeptHealthSummary(TENANT_ID, DEPT_ID)

    expect(result.adherenceRate).toBeNull()
    expect(result.responseCount).toBe(0)
    expect(result.totalRecipients).toBe(0)
    expect(result.questionScores).toHaveLength(0)
  })

  it("calcula adherenceRate corretamente", async () => {
    mockFindDeptDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])

    const result = await getDeptHealthSummary(TENANT_ID, DEPT_ID)

    expect(result.adherenceRate).toBe(60)
    expect(result.responseCount).toBe(6)
    expect(result.totalRecipients).toBe(10)
  })

  it("não inclui questões com menos de 5 respostas no questionScores", async () => {
    mockFindDeptDispatchesWithData.mockResolvedValue([makeDispatch(5, 4)])

    const result = await getDeptHealthSummary(TENANT_ID, DEPT_ID)

    expect(result.questionScores).toHaveLength(0)
  })

  it("inclui questões com 5 ou mais respostas no questionScores", async () => {
    mockFindDeptDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])

    const result = await getDeptHealthSummary(TENANT_ID, DEPT_ID)

    expect(result.questionScores).toHaveLength(1)
    expect(result.questionScores[0]?.questionText).toBe("Estresse")
  })

  it("retorna alertas ativos do setor", async () => {
    const alert = { type: "score_drop", severity: "high", message: "Score caiu", createdAt: new Date() }
    mockFindDeptActiveAlerts.mockResolvedValue([alert])

    const result = await getDeptHealthSummary(TENANT_ID, DEPT_ID)

    expect(result.activeAlerts).toHaveLength(1)
    expect(result.activeAlerts[0]?.type).toBe("score_drop")
  })
})

describe("getAvailableQuestions", () => {
  it("delega ao repository", async () => {
    mockFindUniqueQuestions.mockResolvedValue([])
    await getAvailableQuestions(TENANT_ID)
    expect(mockFindUniqueQuestions).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("getDashboardData — trend down", () => {
  it("retorna trend 'down' quando avg do mês atual é menor que avg do mês anterior", async () => {
    const prevDispatchedAt = new Date()
    prevDispatchedAt.setDate(prevDispatchedAt.getDate() - 35)

    const prevMonthDispatch: DispatchWithData = {
      id: "prev-month",
      tenantId: TENANT_ID,
      healthSurveyConfigurationId: "config-1",
      scheduledAt: prevDispatchedAt,
      dispatchedAt: prevDispatchedAt,
      adherenceCheckedAt: null,
      status: "available",
      totalRecipients: 10,
      totalResponses: 6,
      signedLinkToken: null,
      createdAt: prevDispatchedAt,
      healthSurveyConfiguration: CONFIG_FIXTURE,
      responses: Array.from({ length: 6 }, (_, i) => ({
        id: `prev-response-${i}`,
        tenantId: TENANT_ID,
        dispatchId: "prev-month",
        createdAt: prevDispatchedAt,
        items: [
          {
            id: `prev-item-${i}`,
            healthSurveyResponseId: `prev-response-${i}`,
            questionId: "q-1",
            score: 1,
            question: { id: "q-1", text: "Estresse", order: 1, scoreDirection: "lower_is_better" },
          },
        ],
      })),
    }

    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 6), prevMonthDispatch])
    mockFindActiveDepartments.mockResolvedValue([{ id: DEPT_ID, name: DEPT_NAME }])

    const result = await getDashboardData(TENANT_ID)

    expect(result.deptCards[0]?.trend).toBe("down")
    expect(result.deptCards[0]?.prevAvg).not.toBeNull()
    expect(result.deptCards[0]?.trendDelta).not.toBe(0)
  })
})

describe("getDashboardData — reconciliação de departamentos", () => {
  it("inclui departamento ativo sem dispatches com hasData=false", async () => {
    mockFindDispatchesWithData.mockResolvedValue([])
    mockFindActiveDepartments.mockResolvedValue([{ id: "dept-novo", name: "Laboratório de Teste" }])

    const result = await getDashboardData(TENANT_ID)

    expect(result.deptCards).toHaveLength(1)
    expect(result.deptCards[0]?.deptId).toBe("dept-novo")
    expect(result.deptCards[0]?.hasData).toBe(false)
  })

  it("exclui departamento inativo que possui dispatches históricos", async () => {
    mockFindDispatchesWithData.mockResolvedValue([makeDispatch(5, 6)])
    mockFindActiveDepartments.mockResolvedValue([])

    const result = await getDashboardData(TENANT_ID)

    expect(result.deptCards).toHaveLength(0)
  })
})
