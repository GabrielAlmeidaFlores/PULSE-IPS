import { describe, it, expect, vi, beforeEach } from "vitest"
import { normalizeItemScore, calcAvgFromResponses, detectLowScoreAlerts, detectScoreDropAlerts, detectNegativeTrendAlerts, detectConsentExpiredAlerts, getAlerts, getAlertsPaginated, getAlertStats, markRead, resolve } from "@/modules/alerts/alert.service"
import {
  findAllTenantsRecentHealthSurveyResponsesForAlerts,
  findAllTenantsResponsesInWindow,
  findAllTenantsActiveDepartments,
  findAllTenantsDeptRecentDispatchAvgs,
  findAllTenantsEmployeesWithExpiredConsentTokens,
  createAlert,
  hasOpenAlertOfType,
  findAlertsByTenant,
  findAlertsByTenantPaginated,
  findAlertStatsByTenant,
  markAlertRead,
  resolveAlert,
} from "@/modules/alerts/alert.repository"

vi.mock("@/modules/alerts/alert.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindRecentResponses = vi.mocked(findAllTenantsRecentHealthSurveyResponsesForAlerts)
const mockFindResponsesInWindow = vi.mocked(findAllTenantsResponsesInWindow)
const mockFindActiveDepts = vi.mocked(findAllTenantsActiveDepartments)
const mockFindDeptDispatchAvgs = vi.mocked(findAllTenantsDeptRecentDispatchAvgs)
const mockFindExpiredConsent = vi.mocked(findAllTenantsEmployeesWithExpiredConsentTokens)
const mockCreateAlert = vi.mocked(createAlert)
const mockHasOpenAlert = vi.mocked(hasOpenAlertOfType)
const mockFindAlertsByTenant = vi.mocked(findAlertsByTenant)
const mockFindAlertsByTenantPaginated = vi.mocked(findAlertsByTenantPaginated)
const mockFindAlertStatsByTenant = vi.mocked(findAlertStatsByTenant)
const mockMarkAlertRead = vi.mocked(markAlertRead)
const mockResolveAlert = vi.mocked(resolveAlert)

interface ResponseShape {
  tenantId: string
  dispatch: { healthSurveyConfiguration: { department: { id: string; name: string } } }
  items: { score: number; question: { scoreDirection: string } }[]
}

function makeResponse(scores: number[], scoreDirection = "higher_is_better"): ResponseShape {
  return {
    tenantId: "tenant-1",
    dispatch: { healthSurveyConfiguration: { department: { id: "dept-1", name: "Vendas" } } },
    items: scores.map((score) => ({ score, question: { scoreDirection } })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateAlert.mockResolvedValue(undefined)
  mockHasOpenAlert.mockResolvedValue(false)
})

describe("normalizeItemScore", () => {
  it.each([
    [4, "higher_is_better", 4],
    [1, "higher_is_better", 1],
    [5, "higher_is_better", 5],
    [1, "lower_is_better", 5],
    [5, "lower_is_better", 1],
    [3, "lower_is_better", 3],
    [2, "lower_is_better", 4],
  ] as [number, string, number][])(
    "normalizeItemScore(%i, %s) → %i",
    (score, direction, expected) => {
      expect(normalizeItemScore(score, direction)).toBe(expected)
    },
  )
})

describe("calcAvgFromResponses", () => {
  it("returns 0 for empty responses array", () => {
    expect(calcAvgFromResponses([])).toBe(0)
  })

  it("returns 0 for responses with no items", () => {
    expect(calcAvgFromResponses([{ items: [] }])).toBe(0)
  })

  it("calculates correct average for single response", () => {
    const responses = [
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 2, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(3)
  })

  it("normalizes lower_is_better scores before averaging", () => {
    const responses = [
      {
        items: [
          { score: 2, question: { scoreDirection: "lower_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4)
  })

  it("averages across multiple responses and items", () => {
    const responses = [
      {
        items: [
          { score: 5, question: { scoreDirection: "higher_is_better" } },
          { score: 3, question: { scoreDirection: "higher_is_better" } },
        ],
      },
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 4, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4)
  })

  it("mixes higher_is_better and lower_is_better in same response", () => {
    const responses = [
      {
        items: [
          { score: 5, question: { scoreDirection: "higher_is_better" } },
          { score: 1, question: { scoreDirection: "lower_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(5)
  })

  it("returns 1.5 for scores 2 and 1", () => {
    const responses = [
      {
        items: [
          { score: 2, question: { scoreDirection: "higher_is_better" } },
          { score: 1, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(1.5)
  })

  it("returns 4.5 for scores 4 and 5", () => {
    const responses = [
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 5, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4.5)
  })
})

describe("detectLowScoreAlerts", () => {
  it("creates no alert when no responses", async () => {
    mockFindRecentResponses.mockResolvedValue([])

    await detectLowScoreAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates no alert when avg score is above threshold", async () => {
    const responses = Array.from({ length: 5 }, () => makeResponse([4, 5]))
    mockFindRecentResponses.mockResolvedValue(responses)

    await detectLowScoreAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates no alert when fewer than 5 respondents (anonymity guard)", async () => {
    const responses = Array.from({ length: 4 }, () => makeResponse([1]))
    mockFindRecentResponses.mockResolvedValue(responses)

    await detectLowScoreAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates warning alert when avg score is below threshold", async () => {
    const responses = Array.from({ length: 5 }, () => makeResponse([2, 3]))
    mockFindRecentResponses.mockResolvedValue(responses)

    await detectLowScoreAlerts()
    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "low_score", severity: "warning", tenantId: "tenant-1" }),
    )
  })

  it("creates critical alert when avg score is below 2", async () => {
    const responses = Array.from({ length: 5 }, () => makeResponse([1, 1]))
    mockFindRecentResponses.mockResolvedValue(responses)

    await detectLowScoreAlerts()
    expect(mockCreateAlert).toHaveBeenCalledWith(expect.objectContaining({ severity: "critical" }))
  })

  it("skips creating alert when open alert already exists", async () => {
    const responses = Array.from({ length: 5 }, () => makeResponse([1, 1]))
    mockFindRecentResponses.mockResolvedValue(responses)
    mockHasOpenAlert.mockResolvedValue(true)

    await detectLowScoreAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })
})

describe("detectScoreDropAlerts", () => {
  it("creates no alert when no current responses", async () => {
    mockFindResponsesInWindow.mockResolvedValue([])

    await detectScoreDropAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates no alert when dept has no previous data", async () => {
    mockFindResponsesInWindow
      .mockResolvedValueOnce([makeResponse([3])])
      .mockResolvedValueOnce([])

    await detectScoreDropAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates no alert when drop is within threshold (1.0)", async () => {
    const current = makeResponse([3])
    const previous = makeResponse([3.5])
    mockFindResponsesInWindow
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([previous])

    await detectScoreDropAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates warning alert when score drops by more than 1 point", async () => {
    const current = Array.from({ length: 5 }, () => makeResponse([2]))
    const previous = Array.from({ length: 5 }, () => makeResponse([4]))
    mockFindResponsesInWindow
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(previous)

    await detectScoreDropAlerts()
    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "score_drop", severity: "warning" }),
    )
  })

  it("creates critical alert when score drops by more than 2 points", async () => {
    const current = Array.from({ length: 5 }, () => makeResponse([1]))
    const previous = Array.from({ length: 5 }, () => makeResponse([4]))
    mockFindResponsesInWindow
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(previous)

    await detectScoreDropAlerts()
    expect(mockCreateAlert).toHaveBeenCalledWith(expect.objectContaining({ severity: "critical" }))
  })

  it("skips when open alert already exists", async () => {
    const current = Array.from({ length: 5 }, () => makeResponse([2]))
    const previous = Array.from({ length: 5 }, () => makeResponse([5]))
    mockFindResponsesInWindow
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(previous)
    mockHasOpenAlert.mockResolvedValue(true)

    await detectScoreDropAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })
})

describe("detectNegativeTrendAlerts", () => {
  it("creates no alert when no departments", async () => {
    mockFindActiveDepts.mockResolvedValue([])

    await detectNegativeTrendAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("skips dept with fewer than 3 periods", async () => {
    mockFindActiveDepts.mockResolvedValue([{ id: "dept-1", tenantId: "tenant-1", name: "Vendas" }])
    mockFindDeptDispatchAvgs.mockResolvedValue([{ avgScore: 2 }, { avgScore: 2 }] as Awaited<ReturnType<typeof findAllTenantsDeptRecentDispatchAvgs>>)

    await detectNegativeTrendAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates alert when last 3 periods are below historical avg", async () => {
    mockFindActiveDepts.mockResolvedValue([{ id: "dept-1", tenantId: "tenant-1", name: "Vendas" }])
    mockFindDeptDispatchAvgs.mockResolvedValue([
      { avgScore: 2 }, { avgScore: 2 }, { avgScore: 2 },
      { avgScore: 4 }, { avgScore: 4 }, { avgScore: 4 },
    ] as Awaited<ReturnType<typeof findAllTenantsDeptRecentDispatchAvgs>>)

    await detectNegativeTrendAlerts()
    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "negative_trend", severity: "warning" }),
    )
  })

  it("does not create alert when last 3 periods are not below historical avg", async () => {
    mockFindActiveDepts.mockResolvedValue([{ id: "dept-1", tenantId: "tenant-1", name: "Vendas" }])
    mockFindDeptDispatchAvgs.mockResolvedValue([
      { avgScore: 4 }, { avgScore: 4 }, { avgScore: 4 },
      { avgScore: 2 }, { avgScore: 2 }, { avgScore: 2 },
    ] as Awaited<ReturnType<typeof findAllTenantsDeptRecentDispatchAvgs>>)

    await detectNegativeTrendAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })
})

describe("detectConsentExpiredAlerts", () => {
  it("creates no alert when no expired tokens", async () => {
    mockFindExpiredConsent.mockResolvedValue([])

    await detectConsentExpiredAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })

  it("creates alert per department with expired consents", async () => {
    mockFindExpiredConsent.mockResolvedValue([
      { tenantId: "tenant-1", departmentId: "dept-1", departmentName: "Vendas", employeeId: "emp-1" },
      { tenantId: "tenant-1", departmentId: "dept-1", departmentName: "Vendas", employeeId: "emp-2" },
    ])

    await detectConsentExpiredAlerts()
    expect(mockCreateAlert).toHaveBeenCalledOnce()
    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "consent_expired", tenantId: "tenant-1", departmentId: "dept-1" }),
    )
  })

  it("groups multiple employees in same dept into one alert", async () => {
    mockFindExpiredConsent.mockResolvedValue([
      { tenantId: "t1", departmentId: "d1", departmentName: "RH", employeeId: "emp-1" },
      { tenantId: "t1", departmentId: "d1", departmentName: "RH", employeeId: "emp-2" },
      { tenantId: "t1", departmentId: "d2", departmentName: "TI", employeeId: "emp-3" },
    ])

    await detectConsentExpiredAlerts()
    expect(mockCreateAlert).toHaveBeenCalledTimes(2)
  })

  it("skips when open alert already exists", async () => {
    mockFindExpiredConsent.mockResolvedValue([
      { tenantId: "t1", departmentId: "d1", departmentName: "RH", employeeId: "emp-1" },
    ])
    mockHasOpenAlert.mockResolvedValue(true)

    await detectConsentExpiredAlerts()
    expect(mockCreateAlert).not.toHaveBeenCalled()
  })
})

describe("normalizeItemScore", () => {
  it("returns score as-is for higher_is_better direction", () => {
    expect(normalizeItemScore(4, "higher_is_better")).toBe(4)
    expect(normalizeItemScore(1, "higher_is_better")).toBe(1)
    expect(normalizeItemScore(5, "higher_is_better")).toBe(5)
  })

  it("inverts score for lower_is_better direction", () => {
    expect(normalizeItemScore(1, "lower_is_better")).toBe(5)
    expect(normalizeItemScore(5, "lower_is_better")).toBe(1)
    expect(normalizeItemScore(3, "lower_is_better")).toBe(3)
    expect(normalizeItemScore(2, "lower_is_better")).toBe(4)
  })
})

describe("calcAvgFromResponses", () => {
  it("returns 0 for empty responses array", () => {
    expect(calcAvgFromResponses([])).toBe(0)
  })

  it("returns 0 for responses with no items", () => {
    expect(calcAvgFromResponses([{ items: [] }])).toBe(0)
  })

  it("calculates correct average for single response", () => {
    const responses = [
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 2, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(3)
  })

  it("normalizes lower_is_better scores before averaging", () => {
    const responses = [
      {
        items: [
          { score: 2, question: { scoreDirection: "lower_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4)
  })

  it("averages across multiple responses and items", () => {
    const responses = [
      {
        items: [
          { score: 5, question: { scoreDirection: "higher_is_better" } },
          { score: 3, question: { scoreDirection: "higher_is_better" } },
        ],
      },
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 4, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4)
  })

  it("mixes higher_is_better and lower_is_better in same response", () => {
    const responses = [
      {
        items: [
          { score: 5, question: { scoreDirection: "higher_is_better" } },
          { score: 1, question: { scoreDirection: "lower_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(5)
  })

  it("returns 1.5 for scores 2 and 1", () => {
    const responses = [
      {
        items: [
          { score: 2, question: { scoreDirection: "higher_is_better" } },
          { score: 1, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(1.5)
  })

  it("returns 4.5 for scores 4 and 5", () => {
    const responses = [
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 5, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4.5)
  })
})

describe("getAlerts", () => {
  it("returns alerts for the given tenant", async () => {
    const alerts = [{ id: "alert-1", tenantId: "t-1", type: "score_drop", department: null }]
    mockFindAlertsByTenant.mockResolvedValue(alerts as Awaited<ReturnType<typeof findAlertsByTenant>>)

    const result = await getAlerts("t-1")
    expect(result).toEqual(alerts)
    expect(mockFindAlertsByTenant).toHaveBeenCalledWith("t-1")
  })
})

describe("markRead", () => {
  it("marks the alert as read successfully", async () => {
    mockMarkAlertRead.mockResolvedValue({ count: 1 })

    await markRead("t-1", "alert-1")
    expect(mockMarkAlertRead).toHaveBeenCalledWith("t-1", "alert-1")
  })

  it("throws AppError when alert is not found", async () => {
    mockMarkAlertRead.mockResolvedValue({ count: 0 })

    await expect(markRead("t-1", "missing-id")).rejects.toMatchObject({ code: "ALERT_NOT_FOUND" })
  })
})

describe("resolve", () => {
  it("resolves the alert successfully", async () => {
    mockResolveAlert.mockResolvedValue({ count: 1 })

    await resolve("t-1", "alert-1", "user-1")
    expect(mockResolveAlert).toHaveBeenCalledWith("t-1", "alert-1", "user-1")
  })

  it("throws AppError when alert is not found", async () => {
    mockResolveAlert.mockResolvedValue({ count: 0 })

    await expect(resolve("t-1", "missing-id", "user-1")).rejects.toMatchObject({ code: "ALERT_NOT_FOUND" })
  })
})

describe("detectLowScoreAlerts — groupByDept branch (multiple responses same dept)", () => {
  const makeGroupedResponses = (deptId: string): ResponseShape[] =>
    Array.from({ length: 5 }, (_, i) => ({
      tenantId: "t-1",
      items: [{ score: i % 2 === 0 ? 2 : 1, question: { scoreDirection: "higher_is_better" } }],
      dispatch: { healthSurveyConfiguration: { department: { id: deptId, name: "TI" } } },
    }))

  it("aggregates multiple responses for same department into one alert check", async () => {
    mockFindRecentResponses.mockResolvedValue(makeGroupedResponses("dept-1"))
    mockHasOpenAlert.mockResolvedValue(false)
    mockCreateAlert.mockResolvedValue(undefined)

    await detectLowScoreAlerts()

    expect(mockCreateAlert).toHaveBeenCalledOnce()
  })
})

describe("getAlertsPaginated", () => {
  it("repassa filtros e paginação ao repository", async () => {
    mockFindAlertsByTenantPaginated.mockResolvedValue({ alerts: [], total: 0 } as Awaited<ReturnType<typeof findAlertsByTenantPaginated>>)

    await getAlertsPaginated("t-1", { page: 2, pageSize: 10, type: "score_drop", severity: "high", status: "open" })

    expect(mockFindAlertsByTenantPaginated).toHaveBeenCalledWith(
      "t-1",
      { type: "score_drop", severity: "high", status: "open" },
      10,
      10,
    )
  })

  it("omite filtros ausentes", async () => {
    mockFindAlertsByTenantPaginated.mockResolvedValue({ alerts: [], total: 0 } as Awaited<ReturnType<typeof findAlertsByTenantPaginated>>)

    await getAlertsPaginated("t-1", { page: 1, pageSize: 5 })

    expect(mockFindAlertsByTenantPaginated).toHaveBeenCalledWith("t-1", {}, 0, 5)
  })
})

describe("getAlertStats", () => {
  it("delega ao repository e retorna estatísticas", async () => {
    const stats = { total: 5, unresolved: 3, criticalUnresolved: 1, resolved: 2 }
    mockFindAlertStatsByTenant.mockResolvedValue(stats as Awaited<ReturnType<typeof findAlertStatsByTenant>>)

    const result = await getAlertStats("t-1")

    expect(mockFindAlertStatsByTenant).toHaveBeenCalledWith("t-1")
    expect(result).toEqual(stats)
  })
})
