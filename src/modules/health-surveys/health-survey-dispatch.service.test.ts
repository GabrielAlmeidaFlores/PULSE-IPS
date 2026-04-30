import { describe, it, expect, vi, beforeEach } from "vitest"
import { runHealthSurveyDispatcher, runHealthSurveyAutoDispatchScheduler, checkHealthSurveyDispatchAdherence } from "@/modules/health-surveys/health-survey-dispatch.service"
import {
  findAllTenantsPendingHealthSurveyDispatches,
  findAllTenantsActiveHealthSurveyConfigsForAutoDispatch,
  createHealthSurveyTokensAndMarkSent,
  createHealthSurveyDispatch,
  findAllTenantsHealthSurveyDispatches48hAgo,
  countHealthSurveyResponsesForDispatch,
  createHealthSurveyAdherenceAlert,
  markHealthSurveyDispatchAdherenceChecked,
  type ActiveHealthSurveyConfigForDispatch,
} from "@/modules/health-surveys/health-survey.repository"
import { hasOpenAlertOfType } from "@/modules/alerts/alert.repository"
import { findEmployeeIdsWithAcceptedConsent } from "@/modules/consent/consent.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
type PendingDispatch = Awaited<ReturnType<typeof findAllTenantsPendingHealthSurveyDispatches>>[number]

const mockAddBulk = vi.hoisted(() => vi.fn().mockResolvedValue([]))

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/alerts/alert.repository")
vi.mock("@/modules/consent/consent.repository")
vi.mock("@/modules/billing/billing.service")
vi.mock("@/libs/queue", () => ({ getMessageQueue: vi.fn(() => ({ addBulk: mockAddBulk })) }))
vi.mock("@/libs/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    SURVEY_MESSAGE_TEMPLATE: "Olá {nome}, responda: {link}",
    MESSAGING_PROVIDER: "console",
  },
}))

const mockFindPendingDispatches = vi.mocked(findAllTenantsPendingHealthSurveyDispatches)
const mockFindActiveConfigs = vi.mocked(findAllTenantsActiveHealthSurveyConfigsForAutoDispatch)
const mockCreateSurveyTokensAndMarkSent = vi.mocked(createHealthSurveyTokensAndMarkSent)
const mockCreateDispatch = vi.mocked(createHealthSurveyDispatch)
const mockFindDispatches48hAgo = vi.mocked(findAllTenantsHealthSurveyDispatches48hAgo)
const mockCountResponses = vi.mocked(countHealthSurveyResponsesForDispatch)
const mockCreateAdherenceAlert = vi.mocked(createHealthSurveyAdherenceAlert)
const mockMarkDispatchAdherenceChecked = vi.mocked(markHealthSurveyDispatchAdherenceChecked)
const mockHasOpenAlertOfType = vi.mocked(hasOpenAlertOfType)
const mockFindEmployeeIdsWithAcceptedConsent = vi.mocked(findEmployeeIdsWithAcceptedConsent)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)

const TENANT_ID = "tenant-1"
const WORK_DAY_TIMESTAMP = "2024-01-15T12:00:00-03:00"

const EMPLOYEE = {
  id: "emp-1",
  name: "Ana",
  phone: "+5511999999999",
  workStartTime: null,
  workEndTime: null,
  workDays: [],
}

const DEPARTMENT = {
  id: "dept-1",
  name: "Vendas",
  workStartTime: "09:00",
  workEndTime: "18:00",
  workDays: [{ dayOfWeek: 1 }, { dayOfWeek: 2 }, { dayOfWeek: 3 }, { dayOfWeek: 4 }, { dayOfWeek: 5 }],
  employees: [EMPLOYEE],
}

const AUTO_DISPATCH_DEPT = {
  id: "dept-1",
  name: "Vendas",
  workStartTime: "09:00",
  workEndTime: "18:00",
  workDays: [1, 2, 3, 4, 5],
  employees: [EMPLOYEE],
}

function makePendingDispatch(workDays = [1, 2, 3, 4, 5]): PendingDispatch {
  return {
    id: "dispatch-1",
    tenantId: TENANT_ID,
    organization: { timezone: "America/Sao_Paulo" },
    healthSurveyConfiguration: {
      id: "config-1",
      workStartTime: "09:00",
      workEndTime: "18:00",
      workDays: workDays.map((d) => ({ dayOfWeek: d })),
      department: DEPARTMENT,
    },
  } as unknown as PendingDispatch
}

function makeAutoDispatchConfig(overrides?: Partial<ActiveHealthSurveyConfigForDispatch>): ActiveHealthSurveyConfigForDispatch {
  return {
    id: "config-1",
    tenantId: TENANT_ID,
    frequency: "daily",
    workStartTime: "09:00",
    workEndTime: "18:00",
    workDays: [1, 2, 3, 4, 5],
    lastDispatchedAt: null,
    organization: { timezone: "America/Sao_Paulo" },
    department: { ...AUTO_DISPATCH_DEPT },
    questions: [],
    ...overrides,
  } as ActiveHealthSurveyConfigForDispatch
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddBulk.mockResolvedValue([])
  mockCreateDispatch.mockResolvedValue({ id: "new-dispatch-1" } as Awaited<ReturnType<typeof createHealthSurveyDispatch>>)
  mockCreateSurveyTokensAndMarkSent.mockResolvedValue(undefined)
  mockCreateAdherenceAlert.mockResolvedValue(undefined)
  mockMarkDispatchAdherenceChecked.mockResolvedValue(undefined)
  mockHasOpenAlertOfType.mockResolvedValue(false)
  mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([])
  mockHasTenantPlanFeature.mockResolvedValue(true)
})

describe("runHealthSurveyDispatcher", () => {
  it("returns zero dispatched/errors when no pending dispatches", async () => {
    mockFindPendingDispatches.mockResolvedValue([])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 0, errors: 0 })
  })

  it("skips dispatch when today is not a work day for the config", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-14T12:00:00-03:00"))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch([2, 3, 4, 5])])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 0, errors: 0 })
    expect(mockCreateDispatch).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("dispatches when today is a work day and employees have accepted consent", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([EMPLOYEE.id])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 1, errors: 0 })
    expect(mockCreateDispatch).not.toHaveBeenCalled()
    expect(mockCreateSurveyTokensAndMarkSent).toHaveBeenCalledOnce()
    expect(mockAddBulk).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  it("skips fireDispatch when all employees filtered by work day", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-14T12:00:00-03:00"))

    const sundayEmployee = { ...EMPLOYEE, workDays: [{ dayOfWeek: 0 }] }
    const dept = { ...DEPARTMENT, workDays: [{ dayOfWeek: 1 }], employees: [sundayEmployee] }
    const dispatch = { ...makePendingDispatch([0, 1, 2, 3, 4, 5]), healthSurveyConfiguration: { ...(makePendingDispatch().healthSurveyConfiguration as Record<string, unknown>), department: dept, workDays: [{ dayOfWeek: 0 }] } } as unknown as PendingDispatch

    mockFindPendingDispatches.mockResolvedValue([dispatch])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 0, errors: 0 })

    vi.useRealTimers()
  })

  it("counts errors when a dispatch throws", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindEmployeeIdsWithAcceptedConsent.mockRejectedValue(new Error("DB error"))

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 0, errors: 1 })

    vi.useRealTimers()
  })
})

describe("runHealthSurveyAutoDispatchScheduler", () => {
  it("returns zeros when no configs", async () => {
    mockFindActiveConfigs.mockResolvedValue([])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result).toEqual({ triggered: 0, skipped: 0 })
  })

  it("skips when today is not a work day", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-14T12:00:00-03:00"))

    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig({ workDays: [2, 3, 4, 5] })])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)
    expect(result.triggered).toBe(0)

    vi.useRealTimers()
  })

  it("skips when frequency interval not met since last dispatch", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const recentDispatch = new Date(Date.now() - 1000 * 60 * 60 * 2)
    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig({ lastDispatchedAt: recentDispatch, frequency: "daily" })])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)

    vi.useRealTimers()
  })

  it("triggers when never dispatched before and today is work day", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig()])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([EMPLOYEE.id])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(1)
    expect(result.skipped).toBe(0)

    vi.useRealTimers()
  })

  it("triggers when interval has passed since last dispatch", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const oldDispatch = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig({ lastDispatchedAt: oldDispatch, frequency: "daily" })])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([EMPLOYEE.id])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(1)

    vi.useRealTimers()
  })

  it("counts skipped on error during dispatch", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig()])
    mockFindEmployeeIdsWithAcceptedConsent.mockRejectedValue(new Error("DB fail"))

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)
    expect(result.triggered).toBe(0)

    vi.useRealTimers()
  })
})

describe("checkHealthSurveyDispatchAdherence", () => {
  it("returns zeros when no dispatches to check", async () => {
    mockFindDispatches48hAgo.mockResolvedValue([])

    const result = await checkHealthSurveyDispatchAdherence()
    expect(result).toEqual({ processed: 0, alertsCreated: 0 })
  })

  it("creates alert when adherence is below threshold", async () => {
    const dispatch = {
      id: "d-1",
      tenantId: TENANT_ID,
      totalRecipients: 10,
      healthSurveyConfiguration: { departmentId: "dept-1" },
    }
    mockFindDispatches48hAgo.mockResolvedValue([dispatch])
    mockCountResponses.mockResolvedValue(5)

    const result = await checkHealthSurveyDispatchAdherence()

    expect(result).toEqual({ processed: 1, alertsCreated: 1 })
    expect(mockCreateAdherenceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, adherenceRate: 0.5, responseCount: 5 }),
    )
    expect(mockMarkDispatchAdherenceChecked).toHaveBeenCalledWith(TENANT_ID, "d-1", 5)
  })

  it("does not create alert when adherence is at or above threshold", async () => {
    const dispatch = {
      id: "d-1",
      tenantId: TENANT_ID,
      totalRecipients: 10,
      healthSurveyConfiguration: { departmentId: "dept-1" },
    }
    mockFindDispatches48hAgo.mockResolvedValue([dispatch])
    mockCountResponses.mockResolvedValue(9)

    const result = await checkHealthSurveyDispatchAdherence()

    expect(result.alertsCreated).toBe(0)
    expect(mockCreateAdherenceAlert).not.toHaveBeenCalled()
  })

  it("handles dispatch with zero recipients gracefully (adherence = 0)", async () => {
    const dispatch = {
      id: "d-1",
      tenantId: TENANT_ID,
      totalRecipients: 0,
      healthSurveyConfiguration: { departmentId: "dept-1" },
    }
    mockFindDispatches48hAgo.mockResolvedValue([dispatch])
    mockCountResponses.mockResolvedValue(0)

    const result = await checkHealthSurveyDispatchAdherence()
    expect(result.alertsCreated).toBe(1)
  })
})

describe("runHealthSurveyDispatcher — token work hours fallback chain", () => {
  it("uses employee work hours when employee has explicit workStartTime", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const employeeWithHours = {
      ...EMPLOYEE,
      workStartTime: "07:00",
      workEndTime: "16:00",
    }
    const deptWithEmployee = { ...DEPARTMENT, employees: [employeeWithHours] }
    const dispatch = {
      ...makePendingDispatch(),
      tenantId: TENANT_ID,
      healthSurveyConfiguration: {
        id: "config-1",
        workStartTime: "09:00",
        workEndTime: "18:00",
        workDays: [{ dayOfWeek: 1 }],
        department: deptWithEmployee,
      },
    } as unknown as PendingDispatch
    mockFindPendingDispatches.mockResolvedValue([dispatch])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([EMPLOYEE.id])

    await runHealthSurveyDispatcher()

    expect(mockCreateSurveyTokensAndMarkSent).toHaveBeenCalledWith(
      TENANT_ID,
      "dispatch-1",
      expect.arrayContaining([
        expect.objectContaining({ workStartTime: "07:00", workEndTime: "16:00" }),
      ]),
    )

    vi.useRealTimers()
  })

  it("falls back to config work hours when both employee and department hours are null", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const employeeNoHours = { ...EMPLOYEE, workStartTime: null, workEndTime: null }
    const deptNoHours = { ...DEPARTMENT, workStartTime: null, workEndTime: null, employees: [employeeNoHours] }
    const dispatch = {
      ...makePendingDispatch(),
      tenantId: TENANT_ID,
      healthSurveyConfiguration: {
        id: "config-1",
        workStartTime: "08:00",
        workEndTime: "17:00",
        workDays: [{ dayOfWeek: 1 }],
        department: deptNoHours,
      },
    } as unknown as PendingDispatch
    mockFindPendingDispatches.mockResolvedValue([dispatch])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([EMPLOYEE.id])

    await runHealthSurveyDispatcher()

    expect(mockCreateSurveyTokensAndMarkSent).toHaveBeenCalledWith(
      TENANT_ID,
      "dispatch-1",
      expect.arrayContaining([
        expect.objectContaining({ workStartTime: "08:00", workEndTime: "17:00" }),
      ]),
    )

    vi.useRealTimers()
  })
})

describe("runHealthSurveyAutoDispatchScheduler — edge cases", () => {
  it("counts as not triggered (but not skipped) when fireDispatch returns false", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig()])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(0)
    expect(result.skipped).toBe(0)

    vi.useRealTimers()
  })

  it("uses 7-day default interval for unknown frequency", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const eightDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8)
    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig({ frequency: "unknown_frequency", lastDispatchedAt: eightDaysAgo })])
    mockFindEmployeeIdsWithAcceptedConsent.mockResolvedValue([EMPLOYEE.id])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(1)

    vi.useRealTimers()
  })

  it("skips when last dispatch was 5 days ago with unknown frequency (default 7-day interval not met)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const fiveDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig({ frequency: "unknown_frequency", lastDispatchedAt: fiveDaysAgo })])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)

    vi.useRealTimers()
  })
})
