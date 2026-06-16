import { describe, it, expect, vi } from "vitest"
import {
  getHealthSurveyDispatches,
  scheduleHealthSurveyDispatch,
  getHealthSurveyDispatchDashboard,
  getHealthSurveyMultipleDispatchDashboards,
  getHealthSurveyDispatchesFiltered,
  getHealthSurveyDispatchesPaginatedByDay,
  getHealthSurveyDispatchesPaginated,
} from "@/modules/health-surveys/health-survey-dashboard.service"
import {
  findHealthSurveyDispatchesByTenant,
  createHealthSurveyDispatch,
  findHealthSurveyDispatchWithDashboard,
  findHealthSurveyMultipleDispatchesWithDashboard,
  findHealthSurveyDispatchesByTenantFiltered,
  findHealthSurveyDispatchDaysPaginated,
  findHealthSurveyDispatchesForDates,
  findHealthSurveyDispatchesPaginated,
} from "@/modules/health-surveys/health-survey.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000", HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY: 5 } }))

const mockFindDispatchWithDashboard = vi.mocked(findHealthSurveyDispatchWithDashboard)
const mockFindMultipleDispatches = vi.mocked(findHealthSurveyMultipleDispatchesWithDashboard)
const mockFindDispatchesByTenantFiltered = vi.mocked(findHealthSurveyDispatchesByTenantFiltered)
const mockFindDispatchDaysPaginated = vi.mocked(findHealthSurveyDispatchDaysPaginated)
const mockFindDispatchesForDates = vi.mocked(findHealthSurveyDispatchesForDates)
const mockFindOrganizationById = vi.mocked(findOrganizationById)
const mockFindDispatchesPaginated = vi.mocked(findHealthSurveyDispatchesPaginated)

const TENANT_ID = "tenant-1"
const DATE_FROM_ISO = "2024-01-01"
const DEFAULT_TIMEZONE = "America/Sao_Paulo"

const QUESTIONS = [
  { id: "q-1", text: "Como você está?", order: 1, scoreDirection: "higher_is_better" },
  { id: "q-2", text: "Carga de trabalho", order: 2, scoreDirection: "lower_is_better" },
]

const RESPONSE_ITEMS = [
  { questionId: "q-1", score: 4, departmentId: "dept-1" },
  { questionId: "q-1", score: 2, departmentId: "dept-1" },
  { questionId: "q-2", score: 3, departmentId: "dept-1" },
]

const DISPATCH_DATA = {
  id: "d-1",
  tenantId: TENANT_ID,
  status: "available",
  scheduledAt: new Date("2024-01-15"),
  dispatchedAt: new Date("2024-01-15T10:00:00"),
  configName: "Pesquisa Saúde",
  frequency: "weekly",
  totalRecipients: 10,
  totalResponses: 7,
  signedLinkToken: null,
  departments: [{ id: "dept-1", name: "Vendas" }],
  questions: QUESTIONS,
  responseItems: RESPONSE_ITEMS,
}

describe("getHealthSurveyDispatchDashboard", () => {
  it("returns null when dispatch not found", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(null)
    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-x")
    expect(result).toBeNull()
  })

  it("builds stats with avgScore per question", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")

    expect(result).not.toBeNull()
    if (!result) return

    expect(result.id).toBe("d-1")
    expect(result.totalRecipients).toBe(10)
    expect(result.totalResponses).toBe(7)
    expect(result.notResponded).toBe(3)
    expect(result.adherenceRate).toBeCloseTo(0.7)
    expect(result.questions).toHaveLength(2)
  })

  it("calculates avgScore for higher_is_better question correctly", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")

    const q1 = result?.questions.find((q) => q.id === "q-1")
    expect(q1?.avgScore).toBeCloseTo(3.0)
    expect(q1?.scoreDirection).toBe("higher_is_better")
  })

  it("normalizes lower_is_better scores (6 - score)", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")

    const q2 = result?.questions.find((q) => q.id === "q-2")
    expect(q2?.avgScore).toBeCloseTo(3.0)
    expect(q2?.scoreDirection).toBe("lower_is_better")
  })

  it("returns null avgScore when question has no responses", async () => {
    const dispatchWithNoResponses = { ...DISPATCH_DATA, responseItems: [] }
    mockFindDispatchWithDashboard.mockResolvedValue(dispatchWithNoResponses)

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")
    expect(result?.questions[0]?.avgScore).toBeNull()
  })

  it("computes adherenceRate as 0 when no recipients", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({ ...DISPATCH_DATA, totalRecipients: 0 })

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")
    expect(result?.adherenceRate).toBe(0)
  })

  it("clamps notResponded to 0 minimum when responses exceed recipients", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({ ...DISPATCH_DATA, totalRecipients: 5, totalResponses: 7 })

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")
    expect(result?.notResponded).toBe(0)
  })

  it("includes score distribution for each question", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1")
    const q1 = result?.questions.find((q) => q.id === "q-1")

    expect(q1?.distribution).toHaveLength(5)
    expect(q1?.distribution.find((d) => d.score === 4)?.count).toBe(1)
    expect(q1?.distribution.find((d) => d.score === 2)?.count).toBe(1)
    expect(q1?.distribution.find((d) => d.score === 1)?.count).toBe(0)
  })
})

describe("getHealthSurveyMultipleDispatchDashboards", () => {
  it("returns empty array when no dispatches", async () => {
    mockFindMultipleDispatches.mockResolvedValue([])
    const result = await getHealthSurveyMultipleDispatchDashboards(TENANT_ID, ["d-x"])
    expect(result).toEqual([])
  })

  it("builds stats for each dispatch", async () => {
    mockFindMultipleDispatches.mockResolvedValue([DISPATCH_DATA, { ...DISPATCH_DATA, id: "d-2" }])

    const result = await getHealthSurveyMultipleDispatchDashboards(TENANT_ID, ["d-1", "d-2"])
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe("d-1")
    expect(result[1]?.id).toBe("d-2")
  })
})

describe("getHealthSurveyDispatches", () => {
  it("returns dispatches for the given tenant", async () => {
    const mockFind = vi.mocked(findHealthSurveyDispatchesByTenant)
    mockFind.mockResolvedValue([{ id: "d-1" }] as Awaited<ReturnType<typeof findHealthSurveyDispatchesByTenant>>)

    const result = await getHealthSurveyDispatches(TENANT_ID)
    expect(result).toEqual([{ id: "d-1" }])
    expect(mockFind).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("scheduleHealthSurveyDispatch", () => {
  it("schedules a new dispatch and returns it", async () => {
    const mockCreate = vi.mocked(createHealthSurveyDispatch)
    mockCreate.mockResolvedValue({ id: "new-d" } as Awaited<ReturnType<typeof createHealthSurveyDispatch>>)
    const at = new Date()

    const result = await scheduleHealthSurveyDispatch(TENANT_ID, "config-1", at)
    expect(result).toEqual({ id: "new-d" })
    expect(mockCreate).toHaveBeenCalledWith(TENANT_ID, "config-1", at, "manual", expect.any(String))
  })
})

describe("getHealthSurveyDispatchesFiltered", () => {
  it("repassa sem filtros quando query está vazia", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])

    await getHealthSurveyDispatchesFiltered(TENANT_ID, {})

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, {})
  })

  it("repassa filtro status quando definido", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])

    await getHealthSurveyDispatchesFiltered(TENANT_ID, { status: "available" })

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, { status: "available" })
  })

  it("repassa filtros de data quando definidos", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])
    const dateFrom = new Date(DATE_FROM_ISO)
    const dateTo = new Date("2024-01-31")

    await getHealthSurveyDispatchesFiltered(TENANT_ID, { dateFrom, dateTo })

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, { dateFrom, dateTo })
  })

  it("repassa configId quando definido", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])

    await getHealthSurveyDispatchesFiltered(TENANT_ID, { configId: "config-xyz" })

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, { configId: "config-xyz" })
  })
})

describe("getHealthSurveyDispatchesPaginatedByDay", () => {
  it("retorna lista vazia imediatamente quando não há datas", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [], total: 0 })

    const result = await getHealthSurveyDispatchesPaginatedByDay(TENANT_ID, { page: 1, pageSize: 10 })

    expect(result).toEqual({ items: [], total: 0 })
    expect(mockFindDispatchesForDates).not.toHaveBeenCalled()
  })

  it("calcula skip e busca dispatches quando há datas", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    const dates = ["2024-01-15", "2024-01-16"]
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates, total: 2 })
    const dispatches = [{ id: "d-1" }, { id: "d-2" }] as Awaited<ReturnType<typeof findHealthSurveyDispatchesForDates>>
    mockFindDispatchesForDates.mockResolvedValue(dispatches)

    const result = await getHealthSurveyDispatchesPaginatedByDay(TENANT_ID, { page: 3, pageSize: 5 })

    expect(mockFindDispatchDaysPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 10, 5, DEFAULT_TIMEZONE)
    expect(mockFindDispatchesForDates).toHaveBeenCalledWith(TENANT_ID, dates, {}, DEFAULT_TIMEZONE)
    expect(result).toEqual({ items: dispatches, total: 2 })
  })

  it("repassa filtros para ambas as queries", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    const dateFrom = new Date(DATE_FROM_ISO)
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [DATE_FROM_ISO], total: 1 })
    mockFindDispatchesForDates.mockResolvedValue([])

    await getHealthSurveyDispatchesPaginatedByDay(TENANT_ID, {
      page: 1,
      pageSize: 10,
      status: "available",
      dateFrom,
    })

    expect(mockFindDispatchDaysPaginated).toHaveBeenCalledWith(TENANT_ID, { status: "available", dateFrom }, 0, 10, DEFAULT_TIMEZONE)
    expect(mockFindDispatchesForDates).toHaveBeenCalledWith(TENANT_ID, [DATE_FROM_ISO], { status: "available", dateFrom }, DEFAULT_TIMEZONE)
  })

  it("usa America/Sao_Paulo como timezone padrão quando org não é encontrada", async () => {
    mockFindOrganizationById.mockResolvedValue(null)
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [], total: 0 })

    await getHealthSurveyDispatchesPaginatedByDay(TENANT_ID, { page: 1, pageSize: 10 })

    expect(mockFindDispatchDaysPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 0, 10, "America/Sao_Paulo")
  })

  it("repassa filtros dateTo e configId quando definidos", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    const dateTo = new Date("2024-01-31")
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [], total: 0 })

    await getHealthSurveyDispatchesPaginatedByDay(TENANT_ID, {
      page: 1,
      pageSize: 10,
      dateTo,
      configId: "config-1",
    })

    expect(mockFindDispatchDaysPaginated).toHaveBeenCalledWith(
      TENANT_ID,
      { dateTo, configId: "config-1" },
      0,
      10,
      DEFAULT_TIMEZONE,
    )
  })
})

describe("getHealthSurveyDispatchDashboard — filterDeptIds", () => {
  it("filtra itens de resposta para o departamento selecionado", async () => {
    const mixedItems = [
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 1, departmentId: "dept-2" },
    ]
    mockFindDispatchWithDashboard.mockResolvedValue({
      ...DISPATCH_DATA,
      questions: [{ id: "q-1", text: "Como está?", order: 1, scoreDirection: "higher_is_better" }],
      responseItems: mixedItems,
      totalResponses: 6,
    })

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1", ["dept-1"])

    const q1 = result?.questions.find((q) => q.id === "q-1")
    expect(q1?.avgScore).toBeCloseTo(5.0)
  })

  it("oculta estatísticas quando respondentes filtrados são insuficientes (< 5)", async () => {
    const sparseItems = [
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-2" },
      { questionId: "q-1", score: 5, departmentId: "dept-2" },
      { questionId: "q-1", score: 5, departmentId: "dept-2" },
    ]
    mockFindDispatchWithDashboard.mockResolvedValue({
      ...DISPATCH_DATA,
      questions: [{ id: "q-1", text: "Como está?", order: 1, scoreDirection: "higher_is_better" }],
      responseItems: sparseItems,
      totalResponses: 5,
    })

    const result = await getHealthSurveyDispatchDashboard(TENANT_ID, "d-1", ["dept-1"])

    expect(result?.questions[0]?.avgScore).toBeNull()
  })
})

describe("getHealthSurveyDispatchesPaginated", () => {
  it("repassa filtros e skip para o repositório", async () => {
    mockFindDispatchesPaginated.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findHealthSurveyDispatchesPaginated>>)
    const dateFrom = new Date(DATE_FROM_ISO)
    const dateTo = new Date("2024-01-31")

    await getHealthSurveyDispatchesPaginated(TENANT_ID, {
      page: 2,
      pageSize: 10,
      status: "available",
      dateFrom,
      dateTo,
    })

    expect(mockFindDispatchesPaginated).toHaveBeenCalledWith(
      TENANT_ID,
      { status: "available", dateFrom, dateTo },
      10,
      10,
    )
  })

  it("não repassa filtros ausentes para o repositório", async () => {
    mockFindDispatchesPaginated.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findHealthSurveyDispatchesPaginated>>)

    await getHealthSurveyDispatchesPaginated(TENANT_ID, { page: 1, pageSize: 5 })

    expect(mockFindDispatchesPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 0, 5)
  })

  it("repassa configId quando definido", async () => {
    mockFindDispatchesPaginated.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findHealthSurveyDispatchesPaginated>>)

    await getHealthSurveyDispatchesPaginated(TENANT_ID, { page: 1, pageSize: 10, configId: "config-abc" })

    expect(mockFindDispatchesPaginated).toHaveBeenCalledWith(TENANT_ID, { configId: "config-abc" }, 0, 10)
  })
})
