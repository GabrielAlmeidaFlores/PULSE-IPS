import { describe, it, expect, vi } from "vitest"
import {
  getClimateSurveyDispatches,
  scheduleClimateSurveyDispatch,
  getClimateSurveyDispatchDashboard,
  getClimateSurveyMultipleDispatchDashboards,
  getClimateSurveyDispatchesFiltered,
  getClimateSurveyDispatchesPaginatedByDay,
  getClimateSurveyDispatchesPaginated,
  getLatestActiveClimateSurveyWave,
  getClimateSurveyModuleDashboard,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import {
  findClimateSurveyDispatchesByTenant,
  createClimateSurveyDispatch,
  findClimateSurveyDispatchWithDashboard,
  findClimateSurveyMultipleDispatchesWithDashboard,
  findClimateSurveyDispatchesByTenantFiltered,
  findClimateSurveyDispatchDaysPaginated,
  findClimateSurveyDispatchesForDates,
  findClimateSurveyDispatchesPaginated,
  findClimateSurveyConfigById,
  findLatestActiveClimateSurveyDispatch,
  findRecentAvailableClimateSurveyDispatchesForOverview,
} from "@/modules/climate-surveys/climate-survey.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/climate-surveys/climate-survey-analytics.service", () => ({
  emptyClimateSurveyFunnelMetrics: vi.fn(() => ({
    dispatchId: null,
    emailsSent: 0,
    emailsOpened: 0,
    emailsClicked: 0,
    openRatePercent: null,
    clickRatePercent: null,
    totalRecipients: 0,
    responseStarts: 0,
    responseCompletions: 0,
    startRatePercent: null,
    completionRatePercent: null,
    averageResponseTimeSeconds: null,
    abandonmentByQuestion: [],
  })),
  getClimateSurveyFunnelMetrics: vi.fn(() => Promise.resolve({
    dispatchId: "d-1",
    emailsSent: 10,
    emailsOpened: 5,
    emailsClicked: 2,
    openRatePercent: 50,
    clickRatePercent: 20,
    totalRecipients: 10,
    responseStarts: 4,
    responseCompletions: 3,
    startRatePercent: 40,
    completionRatePercent: 30,
    averageResponseTimeSeconds: 120,
    abandonmentByQuestion: [],
  })),
}))
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000", HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY: 5 } }))

const mockFindDispatchWithDashboard = vi.mocked(findClimateSurveyDispatchWithDashboard)
const mockFindMultipleDispatches = vi.mocked(findClimateSurveyMultipleDispatchesWithDashboard)
const mockFindDispatchesByTenantFiltered = vi.mocked(findClimateSurveyDispatchesByTenantFiltered)
const mockFindDispatchDaysPaginated = vi.mocked(findClimateSurveyDispatchDaysPaginated)
const mockFindDispatchesForDates = vi.mocked(findClimateSurveyDispatchesForDates)
const mockFindOrganizationById = vi.mocked(findOrganizationById)
const mockFindDispatchesPaginated = vi.mocked(findClimateSurveyDispatchesPaginated)
const mockFindConfigById = vi.mocked(findClimateSurveyConfigById)
const mockFindLatestActiveDispatch = vi.mocked(findLatestActiveClimateSurveyDispatch)
const mockFindRecentAvailableForOverview = vi.mocked(findRecentAvailableClimateSurveyDispatchesForOverview)

const TENANT_ID = "tenant-1"
const DATE_FROM_ISO = "2024-01-01"
const DEFAULT_TIMEZONE = "America/Sao_Paulo"

const QUESTIONS = [
  { id: "q-1", text: "Como você está?", order: 1, scoreDirection: "higher_is_better", dimension: "belonging" },
  { id: "q-2", text: "Carga de trabalho", order: 2, scoreDirection: "lower_is_better", dimension: "workload" },
]

const RESPONSE_ITEMS = [
  { questionId: "q-1", score: 4, departmentId: "dept-1", responseId: "r-1" },
  { questionId: "q-1", score: 2, departmentId: "dept-1", responseId: "r-2" },
  { questionId: "q-2", score: 3, departmentId: "dept-1", responseId: "r-1" },
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

describe("getClimateSurveyDispatchDashboard", () => {
  it("returns null when dispatch not found", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(null)
    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-x")
    expect(result).toBeNull()
  })

  it("builds stats with avgScore per question", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")

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

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")

    const q1 = result?.questions.find((q) => q.id === "q-1")
    expect(q1?.avgScore).toBeCloseTo(3.0)
    expect(q1?.scoreDirection).toBe("higher_is_better")
  })

  it("oculta scores quando o grupo tem menos de 5 respostas", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({
      ...DISPATCH_DATA,
      totalResponses: 3,
      responseItems: RESPONSE_ITEMS,
    })

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")

    expect(result?.avgScore).toBeNull()
    expect(result?.questions.every((q) => q.avgScore === null)).toBe(true)
    expect(result?.dimensionScores.every((d) => d.avgScore === null)).toBe(true)
    expect(result?.totalResponses).toBe(3)
  })

  it("normalizes lower_is_better scores (6 - score)", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")

    const q2 = result?.questions.find((q) => q.id === "q-2")
    expect(q2?.avgScore).toBeCloseTo(3.0)
    expect(q2?.scoreDirection).toBe("lower_is_better")
  })

  it("returns null avgScore when question has no responses", async () => {
    const dispatchWithNoResponses = { ...DISPATCH_DATA, responseItems: [] }
    mockFindDispatchWithDashboard.mockResolvedValue(dispatchWithNoResponses)

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")
    expect(result?.questions[0]?.avgScore).toBeNull()
  })

  it("computes adherenceRate as 0 when no recipients", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({ ...DISPATCH_DATA, totalRecipients: 0 })

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")
    expect(result?.adherenceRate).toBe(0)
  })

  it("clamps notResponded to 0 minimum when responses exceed recipients", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({ ...DISPATCH_DATA, totalRecipients: 5, totalResponses: 7 })

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")
    expect(result?.notResponded).toBe(0)
  })

  it("includes score distribution for each question", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1")
    const q1 = result?.questions.find((q) => q.id === "q-1")

    expect(q1?.distribution).toHaveLength(5)
    expect(q1?.distribution.find((d) => d.score === 4)?.count).toBe(1)
    expect(q1?.distribution.find((d) => d.score === 2)?.count).toBe(1)
    expect(q1?.distribution.find((d) => d.score === 1)?.count).toBe(0)
  })
})

describe("getClimateSurveyMultipleDispatchDashboards", () => {
  it("returns empty array when no dispatches", async () => {
    mockFindMultipleDispatches.mockResolvedValue([])
    const result = await getClimateSurveyMultipleDispatchDashboards(TENANT_ID, ["d-x"])
    expect(result).toEqual([])
  })

  it("builds stats for each dispatch", async () => {
    mockFindMultipleDispatches.mockResolvedValue([DISPATCH_DATA, { ...DISPATCH_DATA, id: "d-2" }])

    const result = await getClimateSurveyMultipleDispatchDashboards(TENANT_ID, ["d-1", "d-2"])
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe("d-1")
    expect(result[1]?.id).toBe("d-2")
  })
})

describe("getClimateSurveyDispatches", () => {
  it("returns dispatches for the given tenant", async () => {
    const mockFind = vi.mocked(findClimateSurveyDispatchesByTenant)
    mockFind.mockResolvedValue([{ id: "d-1" }] as Awaited<ReturnType<typeof findClimateSurveyDispatchesByTenant>>)

    const result = await getClimateSurveyDispatches(TENANT_ID)
    expect(result).toEqual([{ id: "d-1" }])
    expect(mockFind).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("scheduleClimateSurveyDispatch", () => {
  it("schedules a new dispatch and returns it", async () => {
    const mockCreate = vi.mocked(createClimateSurveyDispatch)
    mockCreate.mockResolvedValue({ id: "new-d" } as Awaited<ReturnType<typeof createClimateSurveyDispatch>>)
    mockFindConfigById.mockResolvedValue({
      id: "config-1",
      sendViaSignedLink: true,
      sendViaMessaging: true,
    } as Awaited<ReturnType<typeof findClimateSurveyConfigById>>)
    const at = new Date()

    const result = await scheduleClimateSurveyDispatch(TENANT_ID, "config-1", at)
    expect(result).toEqual({ id: "new-d" })
    expect(mockCreate).toHaveBeenCalledWith(TENANT_ID, "config-1", at, "manual", expect.any(String))
  })
})

describe("getClimateSurveyDispatchesFiltered", () => {
  it("repassa sem filtros quando query está vazia", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])

    await getClimateSurveyDispatchesFiltered(TENANT_ID, {})

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, {})
  })

  it("repassa filtro status quando definido", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])

    await getClimateSurveyDispatchesFiltered(TENANT_ID, { status: "available" })

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, { status: "available" })
  })

  it("repassa filtros de data quando definidos", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])
    const dateFrom = new Date(DATE_FROM_ISO)
    const dateTo = new Date("2024-01-31")

    await getClimateSurveyDispatchesFiltered(TENANT_ID, { dateFrom, dateTo })

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, { dateFrom, dateTo })
  })

  it("repassa configId quando definido", async () => {
    mockFindDispatchesByTenantFiltered.mockResolvedValue([])

    await getClimateSurveyDispatchesFiltered(TENANT_ID, { configId: "config-xyz" })

    expect(mockFindDispatchesByTenantFiltered).toHaveBeenCalledWith(TENANT_ID, { configId: "config-xyz" })
  })
})

describe("getClimateSurveyDispatchesPaginatedByDay", () => {
  it("retorna lista vazia imediatamente quando não há datas", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [], total: 0 })

    const result = await getClimateSurveyDispatchesPaginatedByDay(TENANT_ID, { page: 1, pageSize: 10 })

    expect(result).toEqual({ items: [], total: 0 })
    expect(mockFindDispatchesForDates).not.toHaveBeenCalled()
  })

  it("calcula skip e busca dispatches quando há datas", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    const dates = ["2024-01-15", "2024-01-16"]
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates, total: 2 })
    const dispatches = [{ id: "d-1" }, { id: "d-2" }] as Awaited<ReturnType<typeof findClimateSurveyDispatchesForDates>>
    mockFindDispatchesForDates.mockResolvedValue(dispatches)

    const result = await getClimateSurveyDispatchesPaginatedByDay(TENANT_ID, { page: 3, pageSize: 5 })

    expect(mockFindDispatchDaysPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 10, 5, DEFAULT_TIMEZONE)
    expect(mockFindDispatchesForDates).toHaveBeenCalledWith(TENANT_ID, dates, {}, DEFAULT_TIMEZONE)
    expect(result).toEqual({ items: dispatches, total: 2 })
  })

  it("repassa filtros para ambas as queries", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    const dateFrom = new Date(DATE_FROM_ISO)
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [DATE_FROM_ISO], total: 1 })
    mockFindDispatchesForDates.mockResolvedValue([])

    await getClimateSurveyDispatchesPaginatedByDay(TENANT_ID, {
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

    await getClimateSurveyDispatchesPaginatedByDay(TENANT_ID, { page: 1, pageSize: 10 })

    expect(mockFindDispatchDaysPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 0, 10, "America/Sao_Paulo")
  })

  it("repassa filtros dateTo e configId quando definidos", async () => {
    mockFindOrganizationById.mockResolvedValue({ timezone: DEFAULT_TIMEZONE } as Awaited<ReturnType<typeof findOrganizationById>>)
    const dateTo = new Date("2024-01-31")
    mockFindDispatchDaysPaginated.mockResolvedValue({ dates: [], total: 0 })

    await getClimateSurveyDispatchesPaginatedByDay(TENANT_ID, {
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

describe("getClimateSurveyDispatchDashboard — filterDeptIds", () => {
  it("filtra itens de resposta para o departamento selecionado", async () => {
    const mixedItems = [
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-2" },
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-3" },
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-4" },
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-5" },
      { questionId: "q-1", score: 1, departmentId: "dept-2", responseId: "r-6" },
    ]
    mockFindDispatchWithDashboard.mockResolvedValue({
      ...DISPATCH_DATA,
      questions: [{ id: "q-1", text: "Como está?", order: 1, scoreDirection: "higher_is_better", dimension: "other" }],
      responseItems: mixedItems,
      totalResponses: 6,
    })

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1", ["dept-1"])

    const q1 = result?.questions.find((q) => q.id === "q-1")
    expect(q1?.avgScore).toBeCloseTo(5.0)
  })

  it("oculta estatísticas quando respondentes filtrados são insuficientes (< 5)", async () => {
    const sparseItems = [
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-1" },
      { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-2" },
      { questionId: "q-1", score: 5, departmentId: "dept-2", responseId: "r-3" },
      { questionId: "q-1", score: 5, departmentId: "dept-2", responseId: "r-4" },
      { questionId: "q-1", score: 5, departmentId: "dept-2", responseId: "r-5" },
    ]
    mockFindDispatchWithDashboard.mockResolvedValue({
      ...DISPATCH_DATA,
      questions: [{ id: "q-1", text: "Como está?", order: 1, scoreDirection: "higher_is_better", dimension: "other" }],
      responseItems: sparseItems,
      totalResponses: 5,
    })

    const result = await getClimateSurveyDispatchDashboard(TENANT_ID, "d-1", ["dept-1"])

    expect(result?.questions[0]?.avgScore).toBeNull()
  })
})

describe("getClimateSurveyDispatchesPaginated", () => {
  it("repassa filtros e skip para o repositório", async () => {
    mockFindDispatchesPaginated.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findClimateSurveyDispatchesPaginated>>)
    const dateFrom = new Date(DATE_FROM_ISO)
    const dateTo = new Date("2024-01-31")

    await getClimateSurveyDispatchesPaginated(TENANT_ID, {
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
    mockFindDispatchesPaginated.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findClimateSurveyDispatchesPaginated>>)

    await getClimateSurveyDispatchesPaginated(TENANT_ID, { page: 1, pageSize: 5 })

    expect(mockFindDispatchesPaginated).toHaveBeenCalledWith(TENANT_ID, {}, 0, 5)
  })

  it("repassa configId quando definido", async () => {
    mockFindDispatchesPaginated.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findClimateSurveyDispatchesPaginated>>)

    await getClimateSurveyDispatchesPaginated(TENANT_ID, { page: 1, pageSize: 10, configId: "config-abc" })

    expect(mockFindDispatchesPaginated).toHaveBeenCalledWith(TENANT_ID, { configId: "config-abc" }, 0, 10)
  })
})

describe("getLatestActiveClimateSurveyWave", () => {
  it("retorna null quando não há onda disponível", async () => {
    mockFindLatestActiveDispatch.mockResolvedValue(null)

    const result = await getLatestActiveClimateSurveyWave(TENANT_ID)

    expect(result).toBeNull()
    expect(mockFindLatestActiveDispatch).toHaveBeenCalledWith(TENANT_ID)
  })

  it("calcula adesão da última onda ativa", async () => {
    mockFindLatestActiveDispatch.mockResolvedValue({
      id: "d-active",
      status: "available",
      scheduledAt: new Date("2024-02-01T12:00:00Z"),
      dispatchedAt: new Date("2024-02-01T12:05:00Z"),
      climateSurveyConfiguration: {
        name: "Clima Q1",
        configDepartments: [{ department: { name: "Vendas" } }, { department: { name: "Ops" } }],
      },
      deptDispatches: [
        { departmentId: "dept-1", totalRecipients: 10, totalResponses: 7 },
        { departmentId: "dept-2", totalRecipients: 10, totalResponses: 3 },
      ],
    } as Awaited<ReturnType<typeof findLatestActiveClimateSurveyDispatch>>)

    const result = await getLatestActiveClimateSurveyWave(TENANT_ID)

    expect(result).toMatchObject({
      id: "d-active",
      configName: "Clima Q1",
      totalRecipients: 20,
      totalResponses: 10,
      adherencePercent: 50,
      departmentNames: ["Vendas", "Ops"],
    })
  })
})

describe("getClimateSurveyModuleDashboard", () => {
  it("retorna dashboard vazio quando não há ondas disponíveis", async () => {
    mockFindRecentAvailableForOverview.mockResolvedValue([])

    const result = await getClimateSurveyModuleDashboard(TENANT_ID)

    expect(result.wave).toBeNull()
    expect(result.kpis.totalResponses).toBe(0)
    expect(result.radar).toHaveLength(8)
    expect(result.enpsBreakdown.total).toBe(0)
    expect(result.funnel.openRatePercent).toBeNull()
  })

  it("calcula KPIs, radar, eNPS e heatmap da onda mais recente", async () => {
    const waveData = {
      ...DISPATCH_DATA,
      id: "d-latest",
      configName: "Clima Atual",
      totalRecipients: 10,
      totalResponses: 6,
      departments: [
        { id: "dept-1", name: "Vendas" },
        { id: "dept-2", name: "Ops" },
      ],
      questions: [
        { id: "q-1", text: "Satisfação", order: 1, scoreDirection: "higher_is_better", dimension: "job_satisfaction" },
        { id: "q-2", text: "Comunicação", order: 2, scoreDirection: "higher_is_better", dimension: "internal_communication" },
      ],
      responseItems: [
        { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-1" },
        { questionId: "q-2", score: 5, departmentId: "dept-1", responseId: "r-1" },
        { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-2" },
        { questionId: "q-2", score: 4, departmentId: "dept-1", responseId: "r-2" },
        { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-3" },
        { questionId: "q-2", score: 5, departmentId: "dept-1", responseId: "r-3" },
        { questionId: "q-1", score: 4, departmentId: "dept-1", responseId: "r-4" },
        { questionId: "q-2", score: 4, departmentId: "dept-1", responseId: "r-4" },
        { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-5" },
        { questionId: "q-2", score: 5, departmentId: "dept-1", responseId: "r-5" },
        { questionId: "q-1", score: 2, departmentId: "dept-2", responseId: "r-6" },
        { questionId: "q-2", score: 2, departmentId: "dept-2", responseId: "r-6" },
      ],
    } as Awaited<ReturnType<typeof findRecentAvailableClimateSurveyDispatchesForOverview>>[number]

    mockFindRecentAvailableForOverview.mockResolvedValue([waveData])

    const result = await getClimateSurveyModuleDashboard(TENANT_ID)

    expect(result.wave?.id).toBe("d-latest")
    expect(result.kpis.adherencePercent).toBe(60)
    expect(result.kpis.totalResponses).toBe(6)
    expect(result.kpis.favorabilityPercent).toBeGreaterThan(0)
    expect(result.enpsBreakdown.total).toBe(6)
    expect(result.radar.find((p) => p.dimension === "job_satisfaction")?.scorePercent).not.toBeNull()
    expect(result.heatmap.departments).toHaveLength(2)
    expect(result.evolution).toHaveLength(1)
    expect(result.funnel.openRatePercent).toBe(50)
  })

  it("não revela scores nem contagens de células com menos de 5 respostas", async () => {
    const waveData = {
      ...DISPATCH_DATA,
      id: "d-small",
      totalRecipients: 10,
      totalResponses: 3,
      departments: [{ id: "dept-1", name: "Vendas" }],
      questions: [
        { id: "q-1", text: "Satisfação", order: 1, scoreDirection: "higher_is_better", dimension: "job_satisfaction" },
      ],
      responseItems: [
        { questionId: "q-1", score: 5, departmentId: "dept-1", responseId: "r-1" },
        { questionId: "q-1", score: 4, departmentId: "dept-1", responseId: "r-2" },
        { questionId: "q-1", score: 3, departmentId: "dept-1", responseId: "r-3" },
      ],
    } as Awaited<ReturnType<typeof findRecentAvailableClimateSurveyDispatchesForOverview>>[number]

    mockFindRecentAvailableForOverview.mockResolvedValue([waveData])

    const result = await getClimateSurveyModuleDashboard(TENANT_ID)

    expect(result.hasEnoughRespondents).toBe(false)
    expect(result.kpis.favorabilityPercent).toBeNull()
    expect(result.kpis.enps).toBeNull()
    expect(result.heatmap.cells.every((cell) => cell.scorePercent === null)).toBe(true)
    expect(result.heatmap.cells.every((cell) => cell.responseCount === null)).toBe(true)
  })
})
