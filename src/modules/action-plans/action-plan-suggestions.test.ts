import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  buildSuggestionFromAlert,
  buildReportSuggestion,
  buildDispatchSuggestion,
  buildConsentSuggestion,
  buildPgrSuggestion,
  computeRawSuggestions,
} from "@/modules/action-plans/suggestions"
import { findSuggestionContextData } from "@/modules/action-plans/action-plan.repository"

vi.mock("@/modules/action-plans/action-plan.repository", () => ({
  findSuggestionContextData: vi.fn(),
}))

const mockFindContext = vi.mocked(findSuggestionContextData)

const DEPT_ID_1 = "dept-1"
const DEPT_NAME_VENDAS = "Vendas"
const DISPATCH_DATE = "2026-04-20"
const SCORE_DROP_TYPE = "score_drop"
const CAT_HARASSMENT = "harassment"
const CAT_OVERLOAD = "overload"
const CAT_CONFLICT = "conflict"
const PGR_PERIOD_CURRENT = "abril/2026"
const REPORT_DATE_1 = "2026-04-01"
const REPORT_DATE_2 = "2026-04-10"
const REPORT_DATE_3 = "2026-04-15"

const baseAlert = {
  id: "alert-1",
  type: SCORE_DROP_TYPE,
  severity: "warning",
  departmentId: DEPT_ID_1,
  department: { name: "TI" },
  message: "Queda de 1.5 pontos no setor TI",
  createdAt: new Date("2026-04-20T10:00:00Z"),
}

describe("buildSuggestionFromAlert", () => {
  it("returns null for unsupported alert type", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, type: "pgr_review_due" })
    expect(result).toBeNull()
  })

  it.each([
    [SCORE_DROP_TYPE],
    ["low_score"],
    ["negative_trend"],
    ["low_adherence"],
    ["no_response"],
  ] as [string][])(
    "returns non-null suggestion for %s type",
    (type) => {
      expect(buildSuggestionFromAlert({ ...baseAlert, type })).not.toBeNull()
    },
  )

  it.each([
    [SCORE_DROP_TYPE, "high"],
    ["low_score", "high"],
    ["negative_trend", "high"],
    ["low_adherence", "medium"],
    ["no_response", "medium"],
  ] as [string, string][])(
    "%s suggestion has %s priority",
    (type, priority) => {
      const result = buildSuggestionFromAlert({ ...baseAlert, type })
      expect(result?.priority).toBe(priority)
    },
  )

  it("score_drop suggestion title contains department name", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, type: SCORE_DROP_TYPE })
    expect(result?.title).toContain("TI")
  })

  it("score_drop suggestion has at least one task", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, type: SCORE_DROP_TYPE })
    expect(result?.tasks.length).toBeGreaterThan(0)
  })

  it("score_drop suggestion key encodes type and department", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, type: SCORE_DROP_TYPE })
    expect(result?.key).toBe("alert-score_drop-dept-1")
  })

  it("negative_trend suggestion reason contains department name", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, type: "negative_trend" })
    expect(result?.reason).toContain("TI")
  })

  it("generates unique key per department and type", () => {
    const dept1 = buildSuggestionFromAlert({ ...baseAlert, type: SCORE_DROP_TYPE, departmentId: DEPT_ID_1 })
    const dept2 = buildSuggestionFromAlert({ ...baseAlert, type: SCORE_DROP_TYPE, departmentId: "dept-2" })
    expect(dept1?.key).not.toBe(dept2?.key)
  })

  it("key uses global scope when departmentId is null", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, departmentId: null, department: null })
    expect(result?.key).toBe("alert-score_drop-global")
  })

  it("title contains 'geral' when departmentId is null", () => {
    const result = buildSuggestionFromAlert({ ...baseAlert, departmentId: null, department: null })
    expect(result?.title).toContain("geral")
  })
})

describe("buildReportSuggestion", () => {
  it("returns null when fewer than 3 open reports", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date() },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date() },
    ]
    expect(buildReportSuggestion(reports, new Set())).toBeNull()
  })

  it("returns suggestion when 3 or more open reports", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date(REPORT_DATE_1) },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date(REPORT_DATE_2) },
      { category: CAT_CONFLICT, status: "analyzing", createdAt: new Date(REPORT_DATE_3) },
    ]
    const result = buildReportSuggestion(reports, new Set())
    expect(result).not.toBeNull()
  })

  it("report suggestion title is correct", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date(REPORT_DATE_1) },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date(REPORT_DATE_2) },
      { category: CAT_CONFLICT, status: "analyzing", createdAt: new Date(REPORT_DATE_3) },
    ]
    const result = buildReportSuggestion(reports, new Set())
    expect(result?.title).toBe("Tratamento de relatos anônimos pendentes")
  })

  it("report suggestion description mentions count", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date(REPORT_DATE_1) },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date(REPORT_DATE_2) },
      { category: CAT_CONFLICT, status: "analyzing", createdAt: new Date(REPORT_DATE_3) },
    ]
    const result = buildReportSuggestion(reports, new Set())
    expect(result?.description).toContain("3 relatos")
  })

  it("returns null when report title already in existing plans", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date() },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date() },
      { category: CAT_CONFLICT, status: "open", createdAt: new Date() },
    ]
    const existingTitles = new Set(["tratamento de relatos anônimos pendentes"])
    expect(buildReportSuggestion(reports, existingTitles)).toBeNull()
  })

  it("description includes 'sem triagem' for open reports", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date(REPORT_DATE_1) },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date(REPORT_DATE_2) },
      { category: CAT_CONFLICT, status: "analyzing", createdAt: new Date(REPORT_DATE_3) },
    ]
    const result = buildReportSuggestion(reports, new Set())
    expect(result?.description).toContain("sem triagem")
  })

  it("description includes 'em análise' for analyzing reports", () => {
    const reports = [
      { category: CAT_HARASSMENT, status: "open", createdAt: new Date(REPORT_DATE_1) },
      { category: CAT_OVERLOAD, status: "open", createdAt: new Date(REPORT_DATE_2) },
      { category: CAT_CONFLICT, status: "analyzing", createdAt: new Date(REPORT_DATE_3) },
    ]
    const result = buildReportSuggestion(reports, new Set())
    expect(result?.description).toContain("em análise")
  })
})

describe("buildDispatchSuggestion", () => {
  const dispatch = {
    id: "dispatch-1",
    totalRecipients: 10,
    totalResponses: 5,
    dispatchedAt: new Date(DISPATCH_DATE),
    healthSurveyConfiguration: { configDepartments: [{ department: { name: DEPT_NAME_VENDAS } }] },
  }

  it("returns null when no dispatches", () => {
    expect(buildDispatchSuggestion([], new Set())).toBeNull()
  })

  it("returns non-null suggestion for low adherence dispatch", () => {
    const result = buildDispatchSuggestion([dispatch], new Set())
    expect(result).not.toBeNull()
  })

  it("dispatch suggestion title contains department name", () => {
    const result = buildDispatchSuggestion([dispatch], new Set())
    expect(result?.title).toContain(DEPT_NAME_VENDAS)
  })

  it("dispatch suggestion description shows adherence percentage", () => {
    const result = buildDispatchSuggestion([dispatch], new Set())
    expect(result?.description).toContain("50%")
  })

  it("dispatch suggestion description shows total recipients", () => {
    const result = buildDispatchSuggestion([dispatch], new Set())
    expect(result?.description).toContain("10")
  })

  it("returns null when dispatch title already in existing plans", () => {
    const result = buildDispatchSuggestion([dispatch], new Set(["aumentar adesão às pesquisas — vendas"]))
    expect(result).toBeNull()
  })

  it("includes missing response count in description", () => {
    const result = buildDispatchSuggestion([dispatch], new Set())
    expect(result?.description).toContain("5 respostas não foram recebidas")
  })
})

describe("buildConsentSuggestion", () => {
  it("returns null when no employees without consent", () => {
    const result = buildConsentSuggestion([], new Map(), new Set())
    expect(result).toBeNull()
  })

  it("returns non-null suggestion when employees are missing consent", () => {
    const groups = [{ departmentId: DEPT_ID_1, _count: { departmentId: 3 } }]
    const deptNames = new Map([[DEPT_ID_1, "RH"]])
    const result = buildConsentSuggestion(groups, deptNames, new Set())
    expect(result).not.toBeNull()
  })

  it("consent suggestion title is correct", () => {
    const groups = [{ departmentId: DEPT_ID_1, _count: { departmentId: 3 } }]
    const deptNames = new Map([[DEPT_ID_1, "RH"]])
    const result = buildConsentSuggestion(groups, deptNames, new Set())
    expect(result?.title).toBe("Engajamento no TCLE — colaboradores sem aceite")
  })

  it("consent suggestion description mentions employee count", () => {
    const groups = [{ departmentId: DEPT_ID_1, _count: { departmentId: 3 } }]
    const deptNames = new Map([[DEPT_ID_1, "RH"]])
    const result = buildConsentSuggestion(groups, deptNames, new Set())
    expect(result?.description).toContain("3 colaboradores")
  })

  it("consent suggestion description mentions department name", () => {
    const groups = [{ departmentId: DEPT_ID_1, _count: { departmentId: 3 } }]
    const deptNames = new Map([[DEPT_ID_1, "RH"]])
    const result = buildConsentSuggestion(groups, deptNames, new Set())
    expect(result?.description).toContain("RH")
  })

  it("uses singular form for single employee", () => {
    const groups = [{ departmentId: DEPT_ID_1, _count: { departmentId: 1 } }]
    const deptNames = new Map([[DEPT_ID_1, "TI"]])
    const result = buildConsentSuggestion(groups, deptNames, new Set())
    expect(result?.description).toContain("1 colaborador ativo")
  })

  it("returns null when consent title already in existing plans", () => {
    const groups = [{ departmentId: DEPT_ID_1, _count: { departmentId: 5 } }]
    const existingTitles = new Set(["engajamento no tcle — colaboradores sem aceite"])
    expect(buildConsentSuggestion(groups, new Map(), existingTitles)).toBeNull()
  })
})

describe("buildPgrSuggestion", () => {
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  it("returns null when review already exists this month", () => {
    const lastReview = { period: PGR_PERIOD_CURRENT, createdAt: new Date() }
    expect(buildPgrSuggestion(lastReview, thisMonthStart, new Set())).toBeNull()
  })

  it("returns suggestion when no review this month", () => {
    const lastReview = { period: "março/2026", createdAt: new Date("2026-03-15") }
    const result = buildPgrSuggestion(lastReview, thisMonthStart, new Set())
    expect(result).not.toBeNull()
    expect(result?.title).toBe("Geração do relatório PGR do mês")
    expect(result?.priority).toBe("low")
  })

  it("returns suggestion when no review ever", () => {
    const result = buildPgrSuggestion(null, thisMonthStart, new Set())
    expect(result).not.toBeNull()
    expect(result?.description).toContain("Nenhum relatório PGR foi gerado até o momento.")
  })

  it("returns null when pgr title already in existing plans", () => {
    const existingTitles = new Set(["geração do relatório pgr do mês"])
    expect(buildPgrSuggestion(null, thisMonthStart, existingTitles)).toBeNull()
  })
})

describe("computeRawSuggestions", () => {
  beforeEach(() => {
    mockFindContext.mockReset()
  })

  const emptyContext = {
    openAlerts: [],
    openReports: [],
    recentDispatches: [],
    recentPlanTitles: [],
    consentPendingByDept: [],
    lastPgrReview: null,
    deptNamesById: new Map<string, string>(),
  }

  it("returns empty array when nothing is wrong", async () => {
    mockFindContext.mockResolvedValue({
      ...emptyContext,
      lastPgrReview: { period: PGR_PERIOD_CURRENT, createdAt: new Date() },
    })
    const result = await computeRawSuggestions("tenant-1")
    expect(result).toEqual([])
  })

  it("generates PGR suggestion when no review this month", async () => {
    mockFindContext.mockResolvedValue(emptyContext)
    const result = await computeRawSuggestions("tenant-1")
    expect(result.some((s) => s.key === "pgr-missing")).toBe(true)
  })

  it("generates alert-based suggestions from open alerts", async () => {
    mockFindContext.mockResolvedValue({
      ...emptyContext,
      lastPgrReview: { period: PGR_PERIOD_CURRENT, createdAt: new Date() },
      openAlerts: [
        {
          id: "a1",
          type: SCORE_DROP_TYPE,
          severity: "warning",
          departmentId: DEPT_ID_1,
          department: { name: "TI" },
          message: "Queda detectada",
          createdAt: new Date(DISPATCH_DATE),
        },
      ],
    })
    const result = await computeRawSuggestions("tenant-1")
    expect(result.some((s) => s.key === "alert-score_drop-dept-1")).toBe(true)
  })

  it("caps alert suggestions so duplicates by key are skipped", async () => {
    const alert1 = { id: "a1", type: SCORE_DROP_TYPE, severity: "warning", departmentId: DEPT_ID_1, department: { name: "TI" }, message: "m1", createdAt: new Date() }
    const alert2 = { id: "a2", type: SCORE_DROP_TYPE, severity: "warning", departmentId: DEPT_ID_1, department: { name: "TI" }, message: "m2", createdAt: new Date() }
    mockFindContext.mockResolvedValue({
      ...emptyContext,
      lastPgrReview: { period: PGR_PERIOD_CURRENT, createdAt: new Date() },
      openAlerts: [alert1, alert2],
    })
    const result = await computeRawSuggestions("tenant-1")
    const keys = result.map((s) => s.key)
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size)
  })

  it("generates consent suggestion when employees without consent exist", async () => {
    mockFindContext.mockResolvedValue({
      ...emptyContext,
      lastPgrReview: { period: PGR_PERIOD_CURRENT, createdAt: new Date() },
      consentPendingByDept: [{ departmentId: DEPT_ID_1, _count: { departmentId: 4 } }],
      deptNamesById: new Map([[DEPT_ID_1, "Suporte"]]),
    })
    const result = await computeRawSuggestions("tenant-1")
    expect(result.some((s) => s.key === "consent-pending")).toBe(true)
  })

  it("generates dispatch suggestion for low-adherence dispatch", async () => {
    mockFindContext.mockResolvedValue({
      ...emptyContext,
      lastPgrReview: { period: PGR_PERIOD_CURRENT, createdAt: new Date() },
      recentDispatches: [
        {
          id: "dispatch-1",
          totalRecipients: 10,
          totalResponses: 5,
          dispatchedAt: new Date(DISPATCH_DATE),
          healthSurveyConfiguration: { configDepartments: [{ department: { name: DEPT_NAME_VENDAS } }] },
        },
      ],
    })
    const result = await computeRawSuggestions("tenant-1")
    expect(result.some((s) => s.key.startsWith("dispatch-"))).toBe(true)
  })

  it("skips dispatch with zero recipients to avoid NaN comparison", async () => {
    mockFindContext.mockResolvedValue({
      ...emptyContext,
      lastPgrReview: { period: PGR_PERIOD_CURRENT, createdAt: new Date() },
      recentDispatches: [
        {
          id: "dispatch-zero",
          totalRecipients: 0,
          totalResponses: 0,
          dispatchedAt: new Date(DISPATCH_DATE),
          healthSurveyConfiguration: { configDepartments: [{ department: { name: DEPT_NAME_VENDAS } }] },
        },
      ],
    })
    const result = await computeRawSuggestions("tenant-1")
    expect(result.some((s) => s.key.startsWith("dispatch-"))).toBe(false)
  })
})
