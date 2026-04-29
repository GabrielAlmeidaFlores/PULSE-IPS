import { describe, it, expect, vi } from "vitest"
import { getHealthSurveyDispatches, scheduleHealthSurveyDispatch, getHealthSurveyDispatchDashboard, getHealthSurveyMultipleDispatchDashboards } from "@/modules/health-surveys/health-survey-dashboard.service"
import { findHealthSurveyDispatchesByTenant, createHealthSurveyDispatch, findHealthSurveyDispatchWithDashboard, findHealthSurveyMultipleDispatchesWithDashboard } from "@/modules/health-surveys/health-survey.repository"

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindDispatchWithDashboard = vi.mocked(findHealthSurveyDispatchWithDashboard)
const mockFindMultipleDispatches = vi.mocked(findHealthSurveyMultipleDispatchesWithDashboard)

const QUESTIONS = [
  { id: "q-1", text: "Como você está?", order: 1, scoreDirection: "higher_is_better" },
  { id: "q-2", text: "Carga de trabalho", order: 2, scoreDirection: "lower_is_better" },
]

const RESPONSE_ITEMS = [
  { questionId: "q-1", score: 4 },
  { questionId: "q-1", score: 2 },
  { questionId: "q-2", score: 3 },
]

const DISPATCH_DATA = {
  id: "d-1",
  tenantId: "tenant-1",
  departmentId: "dept-1",
  status: "sent",
  scheduledAt: new Date("2024-01-15"),
  dispatchedAt: new Date("2024-01-15T10:00:00"),
  departmentName: "Vendas",
  frequency: "weekly",
  totalRecipients: 10,
  totalResponses: 7,
  questions: QUESTIONS,
  responseItems: RESPONSE_ITEMS,
}

describe("getHealthSurveyDispatchDashboard", () => {
  it("returns null when dispatch not found", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(null)
    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-x")
    expect(result).toBeNull()
  })

  it("builds stats with avgScore per question", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")

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

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")

    const q1 = result?.questions.find((q) => q.id === "q-1")
    expect(q1?.avgScore).toBeCloseTo(3.0)
    expect(q1?.scoreDirection).toBe("higher_is_better")
  })

  it("normalizes lower_is_better scores (6 - score)", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")

    const q2 = result?.questions.find((q) => q.id === "q-2")
    expect(q2?.avgScore).toBeCloseTo(3.0)
    expect(q2?.scoreDirection).toBe("lower_is_better")
  })

  it("returns null avgScore when question has no responses", async () => {
    const dispatchWithNoResponses = { ...DISPATCH_DATA, responseItems: [] }
    mockFindDispatchWithDashboard.mockResolvedValue(dispatchWithNoResponses)

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")
    expect(result?.questions[0]?.avgScore).toBeNull()
  })

  it("computes adherenceRate as 0 when no recipients", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({ ...DISPATCH_DATA, totalRecipients: 0 })

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")
    expect(result?.adherenceRate).toBe(0)
  })

  it("clamps notResponded to 0 minimum when responses exceed recipients", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue({ ...DISPATCH_DATA, totalRecipients: 5, totalResponses: 7 })

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")
    expect(result?.notResponded).toBe(0)
  })

  it("includes score distribution for each question", async () => {
    mockFindDispatchWithDashboard.mockResolvedValue(DISPATCH_DATA)

    const result = await getHealthSurveyDispatchDashboard("tenant-1", "d-1")
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
    const result = await getHealthSurveyMultipleDispatchDashboards("tenant-1", ["d-x"])
    expect(result).toEqual([])
  })

  it("builds stats for each dispatch", async () => {
    mockFindMultipleDispatches.mockResolvedValue([DISPATCH_DATA, { ...DISPATCH_DATA, id: "d-2" }])

    const result = await getHealthSurveyMultipleDispatchDashboards("tenant-1", ["d-1", "d-2"])
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe("d-1")
    expect(result[1]?.id).toBe("d-2")
  })
})

describe("getHealthSurveyDispatches", () => {
  it("returns dispatches for the given tenant", async () => {
    const mockFind = vi.mocked(findHealthSurveyDispatchesByTenant)
    mockFind.mockResolvedValue([{ id: "d-1" }] as Awaited<ReturnType<typeof findHealthSurveyDispatchesByTenant>>)

    const result = await getHealthSurveyDispatches("tenant-1")
    expect(result).toEqual([{ id: "d-1" }])
    expect(mockFind).toHaveBeenCalledWith("tenant-1")
  })
})

describe("scheduleHealthSurveyDispatch", () => {
  it("schedules a new dispatch and returns it", async () => {
    const mockCreate = vi.mocked(createHealthSurveyDispatch)
    mockCreate.mockResolvedValue({ id: "new-d" } as Awaited<ReturnType<typeof createHealthSurveyDispatch>>)
    const at = new Date()

    const result = await scheduleHealthSurveyDispatch("tenant-1", "config-1", at)
    expect(result).toEqual({ id: "new-d" })
    expect(mockCreate).toHaveBeenCalledWith("tenant-1", "config-1", at)
  })
})
