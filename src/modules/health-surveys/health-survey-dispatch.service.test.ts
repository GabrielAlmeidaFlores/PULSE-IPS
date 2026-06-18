import { describe, it, expect, vi, beforeEach } from "vitest"
import { runHealthSurveyDispatcher, runHealthSurveyAutoDispatchScheduler, checkHealthSurveyDispatchAdherence } from "@/modules/health-surveys/health-survey-dispatch.service"
import {
  findAllTenantsPendingHealthSurveyDispatches,
  findAllTenantsActiveHealthSurveyConfigsForAutoDispatch,
  createHealthSurveyTokens,
  markHealthSurveyDispatchDispatched,
  upsertHealthSurveyDeptDispatch,
  createHealthSurveyDispatch,
  findAllTenantsHealthSurveyDispatches48hAgo,
  createHealthSurveyAdherenceAlert,
  markHealthSurveyDispatchAdherenceChecked,
  findExistingTokensForDispatch,
  countHealthSurveyResponsesByDispatchAndDept,
  type ActiveHealthSurveyConfigForDispatch,
} from "@/modules/health-surveys/health-survey.repository"
import { hasOpenAlertOfType } from "@/modules/alerts/alert.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { findEmployeeIdsEligibleForDispatch } from "@/modules/consent/consent.repository"
type PendingDispatch = Awaited<ReturnType<typeof findAllTenantsPendingHealthSurveyDispatches>>[number]

const mockAddBulk = vi.hoisted(() => vi.fn().mockResolvedValue([]))

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/alerts/alert.repository")
vi.mock("@/modules/billing/billing.service")
vi.mock("@/modules/consent/consent.repository")
vi.mock("@/libs/queue", () => ({ getMessageQueue: vi.fn(() => ({ addBulk: mockAddBulk })) }))
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  logger: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    SURVEY_MESSAGE_TEMPLATE: "Olá {nome}, responda: {link}",
    MESSAGING_PROVIDER: "console",
  },
}))

const mockFindPendingDispatches = vi.mocked(findAllTenantsPendingHealthSurveyDispatches)
const mockFindActiveConfigs = vi.mocked(findAllTenantsActiveHealthSurveyConfigsForAutoDispatch)
const mockCreateHealthSurveyTokens = vi.mocked(createHealthSurveyTokens)
const mockMarkDispatchDispatched = vi.mocked(markHealthSurveyDispatchDispatched)
const mockUpsertDeptDispatch = vi.mocked(upsertHealthSurveyDeptDispatch)
const mockCreateDispatch = vi.mocked(createHealthSurveyDispatch)
const mockFindDispatches48hAgo = vi.mocked(findAllTenantsHealthSurveyDispatches48hAgo)
const mockCreateAdherenceAlert = vi.mocked(createHealthSurveyAdherenceAlert)
const mockMarkDispatchAdherenceChecked = vi.mocked(markHealthSurveyDispatchAdherenceChecked)
const mockHasOpenAlertOfType = vi.mocked(hasOpenAlertOfType)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)
const mockFindEmployeeIdsEligibleForDispatch = vi.mocked(findEmployeeIdsEligibleForDispatch)
const mockFindExistingTokensForDispatch = vi.mocked(findExistingTokensForDispatch)
const mockCountResponsesByDispatchAndDept = vi.mocked(countHealthSurveyResponsesByDispatchAndDept)

const TENANT_ID = "tenant-1"
const DISPATCH_ID = "dispatch-1"
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

function makePendingDispatch(workDays = [1, 2, 3, 4, 5], tokenExpiryHours = 48): PendingDispatch {
  return {
    id: DISPATCH_ID,
    tenantId: TENANT_ID,
    organization: { timezone: "America/Sao_Paulo", slug: "test-org" },
    healthSurveyConfiguration: {
      id: "config-1",
      dispatchTime: "12:00",
      respectEmployeeSchedule: false,
      tokenExpiryHours,
      workDays: workDays.map((d) => ({ dayOfWeek: d })),
      configDepartments: [{ department: DEPARTMENT }],
    },
  } as unknown as PendingDispatch
}

function makeAutoDispatchConfig(overrides?: Partial<ActiveHealthSurveyConfigForDispatch>): ActiveHealthSurveyConfigForDispatch {
  return {
    id: "config-1",
    tenantId: TENANT_ID,
    frequency: "daily",
    scheduledDayOfMonth: null,
    dispatchTime: "12:00",
    workDays: [1, 2, 3, 4, 5],
    lastDispatchedAt: null,
    respectEmployeeSchedule: false,
    tokenExpiryHours: 48,
    organization: { timezone: "America/Sao_Paulo", slug: "test-org" },
    departments: [{ ...AUTO_DISPATCH_DEPT }],
    questions: [],
    ...overrides,
  } as ActiveHealthSurveyConfigForDispatch
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddBulk.mockResolvedValue([])
  mockCreateDispatch.mockResolvedValue({ id: "new-dispatch-1" } as Awaited<ReturnType<typeof createHealthSurveyDispatch>>)
  mockCreateHealthSurveyTokens.mockResolvedValue(undefined)
  mockMarkDispatchDispatched.mockResolvedValue(undefined)
  mockUpsertDeptDispatch.mockResolvedValue(undefined)
  mockCreateAdherenceAlert.mockResolvedValue(undefined)
  mockMarkDispatchAdherenceChecked.mockResolvedValue(undefined)
  mockHasOpenAlertOfType.mockResolvedValue(false)
  mockHasTenantPlanFeature.mockResolvedValue(true)
  mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])
  mockFindExistingTokensForDispatch.mockResolvedValue([])
  mockCountResponsesByDispatchAndDept.mockResolvedValue(0)
})

describe("runHealthSurveyDispatcher", () => {
  it("returns zero dispatched/errors when no pending dispatches", async () => {
    mockFindPendingDispatches.mockResolvedValue([])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 0, errors: 0 })
  })

  it("fires manual dispatch even when today is not a config work day — marks as dispatched with 0 recipients", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-14T12:00:00-03:00"))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch([2, 3, 4, 5])])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 1, errors: 0 })
    expect(mockCreateDispatch).not.toHaveBeenCalled()
    expect(mockMarkDispatchDispatched).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)

    vi.useRealTimers()
  })

  it("dispatches when today is a work day and employees have accepted consent", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 1, errors: 0 })
    expect(mockCreateDispatch).not.toHaveBeenCalled()
    expect(mockMarkDispatchDispatched).toHaveBeenCalledOnce()
    expect(mockAddBulk).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  it("marks dispatch as dispatched with 0 recipients when all employees filtered by work day", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-14T12:00:00-03:00"))

    const mondayEmployee = { ...EMPLOYEE, workDays: [{ dayOfWeek: 1 }] }
    const dept = { ...DEPARTMENT, workDays: [{ dayOfWeek: 1 }], employees: [mondayEmployee] }
    const dispatch = { ...makePendingDispatch([0, 1, 2, 3, 4, 5]), healthSurveyConfiguration: { ...(makePendingDispatch().healthSurveyConfiguration as Record<string, unknown>), configDepartments: [{ department: dept }], workDays: [{ dayOfWeek: 0 }] } } as unknown as PendingDispatch

    mockFindPendingDispatches.mockResolvedValue([dispatch])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 1, errors: 0 })
    expect(mockMarkDispatchDispatched).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)

    vi.useRealTimers()
  })

  it("counts errors when a dispatch throws", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockMarkDispatchDispatched.mockRejectedValue(new Error("DB error"))

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 0, errors: 1 })

    vi.useRealTimers()
  })

  it("fires manual dispatch even when current time is outside dispatchTime window", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-15T08:00:00-03:00"))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])

    const result = await runHealthSurveyDispatcher()
    expect(result).toEqual({ dispatched: 1, errors: 0 })
    expect(mockMarkDispatchDispatched).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  it("usa tokenExpiryHours configurado para calcular expiresAt do token (valor não-padrão de 72h)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch([1, 2, 3, 4, 5], 72)])

    await runHealthSurveyDispatcher()

    const expectedExpiresAt = new Date(new Date(WORK_DAY_TIMESTAMP).getTime() + 72 * 60 * 60 * 1000)
    expect(mockCreateHealthSurveyTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ expiresAt: expectedExpiresAt }),
      ]),
    )

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

  it("pula quando horário atual não é o horário de disparo configurado", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-15T22:00:00-03:00"))

    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig({ dispatchTime: "12:00" })])

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

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(1)

    vi.useRealTimers()
  })

  it("counts skipped on error during dispatch", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindActiveConfigs.mockResolvedValue([makeAutoDispatchConfig()])
    mockCreateDispatch.mockRejectedValue(new Error("DB fail"))

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)
    expect(result.triggered).toBe(0)

    vi.useRealTimers()
  })
})

describe("runHealthSurveyAutoDispatchScheduler — frequência mensal", () => {
  it("pula quando hoje não é o dia do mês agendado", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({ frequency: "monthly", scheduledDayOfMonth: 20, workDays: [0, 1, 2, 3, 4, 5, 6] }),
    ])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)
    expect(result.triggered).toBe(0)
    expect(mockCreateDispatch).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("dispara quando hoje é o dia do mês agendado e nunca foi disparado antes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({ frequency: "monthly", scheduledDayOfMonth: 15, workDays: [0, 1, 2, 3, 4, 5, 6], lastDispatchedAt: null }),
    ])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])
    mockFindExistingTokensForDispatch.mockResolvedValue([])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(1)
    expect(result.skipped).toBe(0)

    vi.useRealTimers()
  })

  it("pula quando hoje é o dia correto mas o último disparo foi há menos de 25 dias", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const recentDispatch = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({ frequency: "monthly", scheduledDayOfMonth: 15, workDays: [0, 1, 2, 3, 4, 5, 6], lastDispatchedAt: recentDispatch }),
    ])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.skipped).toBe(1)
    expect(result.triggered).toBe(0)

    vi.useRealTimers()
  })

  it("dispara quando hoje é o dia correto e o último disparo foi há mais de 25 dias", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const oldDispatch = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({ frequency: "monthly", scheduledDayOfMonth: 15, workDays: [0, 1, 2, 3, 4, 5, 6], lastDispatchedAt: oldDispatch }),
    ])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])
    mockFindExistingTokensForDispatch.mockResolvedValue([])

    const result = await runHealthSurveyAutoDispatchScheduler()
    expect(result.triggered).toBe(1)
    expect(result.skipped).toBe(0)

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
      deptDispatches: [{ departmentId: "dept-1", totalRecipients: 10 }],
    }
    mockFindDispatches48hAgo.mockResolvedValue([dispatch] as Awaited<ReturnType<typeof findAllTenantsHealthSurveyDispatches48hAgo>>)
    mockCountResponsesByDispatchAndDept.mockResolvedValue(5)

    const result = await checkHealthSurveyDispatchAdherence()

    expect(result).toEqual({ processed: 1, alertsCreated: 1 })
    expect(mockCreateAdherenceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, adherenceRate: 0.5, responseCount: 5 }),
    )
    expect(mockMarkDispatchAdherenceChecked).toHaveBeenCalledWith(TENANT_ID, "d-1")
  })

  it("does not create alert when adherence is at or above threshold", async () => {
    const dispatch = {
      id: "d-1",
      tenantId: TENANT_ID,
      deptDispatches: [{ departmentId: "dept-1", totalRecipients: 10 }],
    }
    mockFindDispatches48hAgo.mockResolvedValue([dispatch] as Awaited<ReturnType<typeof findAllTenantsHealthSurveyDispatches48hAgo>>)
    mockCountResponsesByDispatchAndDept.mockResolvedValue(9)

    const result = await checkHealthSurveyDispatchAdherence()

    expect(result.alertsCreated).toBe(0)
    expect(mockCreateAdherenceAlert).not.toHaveBeenCalled()
  })

  it("handles dispatch with zero recipients gracefully — skips alert creation", async () => {
    const dispatch = {
      id: "d-1",
      tenantId: TENANT_ID,
      deptDispatches: [{ departmentId: "dept-1", totalRecipients: 0 }],
    }
    mockFindDispatches48hAgo.mockResolvedValue([dispatch] as Awaited<ReturnType<typeof findAllTenantsHealthSurveyDispatches48hAgo>>)

    const result = await checkHealthSurveyDispatchAdherence()
    expect(result.alertsCreated).toBe(0)
    expect(mockMarkDispatchAdherenceChecked).toHaveBeenCalledWith(TENANT_ID, "d-1")
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
        dispatchTime: "12:00",
        workDays: [{ dayOfWeek: 1 }],
        configDepartments: [{ department: deptWithEmployee }],
      },
    } as unknown as PendingDispatch
    mockFindPendingDispatches.mockResolvedValue([dispatch])

    await runHealthSurveyDispatcher()

    expect(mockCreateHealthSurveyTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ workStartTime: "07:00", workEndTime: "16:00" }),
      ]),
    )

    vi.useRealTimers()
  })

  it("falls back to department work hours when employee has null hours", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const employeeNoHours = { ...EMPLOYEE, workStartTime: null, workEndTime: null }
    const deptWithHours = { ...DEPARTMENT, workStartTime: "08:00", workEndTime: "17:00", employees: [employeeNoHours] }
    const dispatch = {
      ...makePendingDispatch(),
      tenantId: TENANT_ID,
      healthSurveyConfiguration: {
        id: "config-1",
        dispatchTime: "12:00",
        workDays: [{ dayOfWeek: 1 }],
        configDepartments: [{ department: deptWithHours }],
      },
    } as unknown as PendingDispatch
    mockFindPendingDispatches.mockResolvedValue([dispatch])

    await runHealthSurveyDispatcher()

    expect(mockCreateHealthSurveyTokens).toHaveBeenCalledWith(
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

    const weekendEmployee = { ...EMPLOYEE, workDays: [0, 6] }
    const configWithWeekendEmployees = makeAutoDispatchConfig({
      departments: [{ ...AUTO_DISPATCH_DEPT, employees: [weekendEmployee] }],
    })
    mockFindActiveConfigs.mockResolvedValue([configWithWeekendEmployees])

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

describe("runHealthSurveyDispatcher — consent-based adherence and messaging filter", () => {
  it("marca dispatch como sent com 0 tokens quando nenhum funcionário tem consent aceito", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue([])

    const result = await runHealthSurveyDispatcher()

    expect(result).toEqual({ dispatched: 1, errors: 0 })
    expect(mockCreateHealthSurveyTokens).not.toHaveBeenCalled()
    expect(mockMarkDispatchDispatched).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)
    expect(mockAddBulk).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("creates tokens and sends messages only for employees with accepted consent", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const refusedEmployee = { ...EMPLOYEE, id: "emp-2", phone: "+5511888888888" }
    const dept = { ...DEPARTMENT, employees: [EMPLOYEE, refusedEmployee] }
    const dispatch = {
      ...makePendingDispatch(),
      healthSurveyConfiguration: {
        id: "config-1",
        dispatchTime: "12:00",
        workDays: [{ dayOfWeek: 1 }],
        configDepartments: [{ department: dept }],
      },
    } as unknown as Awaited<ReturnType<typeof findAllTenantsPendingHealthSurveyDispatches>>[number]
    mockFindPendingDispatches.mockResolvedValue([dispatch])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])

    await runHealthSurveyDispatcher()

    expect(mockCreateHealthSurveyTokens).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ employeeId: "emp-1" })]),
    )
    const tokensArg = mockCreateHealthSurveyTokens.mock.calls[0]?.[0]
    expect(tokensArg?.some((t) => t.employeeId === "emp-2")).toBe(false)

    vi.useRealTimers()
  })

  it("totalRecipients reflects only accepted-consent employees, preserving adherence accuracy", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])

    await runHealthSurveyDispatcher()

    const tokensArg = mockCreateHealthSurveyTokens.mock.calls[0]?.[0]
    expect(tokensArg).toHaveLength(1)

    vi.useRealTimers()
  })

  it("does not send messages when tenant has no messaging feature even with accepted employees", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockHasTenantPlanFeature.mockResolvedValue(false)
    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])

    await runHealthSurveyDispatcher()

    expect(mockMarkDispatchDispatched).toHaveBeenCalledOnce()
    expect(mockAddBulk).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("pula funcionário que já respondeu via link assinado antes do disparo (usedAt preenchido)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindExistingTokensForDispatch.mockResolvedValue([
      { employeeId: "emp-1", token: "existing-token", shortCode: null, usedAt: new Date(), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
    ])

    await runHealthSurveyDispatcher()

    expect(mockCreateHealthSurveyTokens).not.toHaveBeenCalled()
    expect(mockMarkDispatchDispatched).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)
    expect(mockAddBulk).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("reutiliza token pré-existente não-usado (criado via link assinado) em vez de criar novo", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const PREEXISTING_TOKEN = "preexisting-token-from-signed-link"
    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindExistingTokensForDispatch.mockResolvedValue([
      { employeeId: "emp-1", token: PREEXISTING_TOKEN, shortCode: null, usedAt: null, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
    ])

    await runHealthSurveyDispatcher()

    expect(mockCreateHealthSurveyTokens).not.toHaveBeenCalled()
    expect(mockMarkDispatchDispatched).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)
    expect(mockAddBulk).toHaveBeenCalledOnce()
    const [jobs] = mockAddBulk.mock.calls[0] as [{ data: { surveyLink: string } }[]]
    expect(jobs[0]?.data.surveyLink).toContain(PREEXISTING_TOKEN)

    vi.useRealTimers()
  })

  it("ignora token pré-existente expirado e cria token novo ao fazer o disparo", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    mockFindPendingDispatches.mockResolvedValue([makePendingDispatch()])
    mockFindExistingTokensForDispatch.mockResolvedValue([
      { employeeId: "emp-1", token: "expired-old-token", shortCode: null, usedAt: null, expiresAt: new Date(Date.now() - 1000) },
    ])

    await runHealthSurveyDispatcher()

    expect(mockCreateHealthSurveyTokens).toHaveBeenCalledOnce()
    expect(mockMarkDispatchDispatched).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)
    expect(mockAddBulk).toHaveBeenCalledOnce()
    const [jobs] = mockAddBulk.mock.calls[0] as [{ data: { surveyLink: string } }[]]
    expect(jobs[0]?.data.surveyLink).not.toContain("expired-old-token")

    vi.useRealTimers()
  })
})

describe("runHealthSurveyAutoDispatchScheduler — respectEmployeeSchedule", () => {
  it("agenda mensagem com delay correto quando colaborador não trabalha hoje", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-15T12:00:00-03:00"))

    const fridayEmployee = {
      ...EMPLOYEE,
      workDays: [5],
      workStartTime: "09:00",
      workEndTime: "18:00",
    }
    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({
        respectEmployeeSchedule: true,
        departments: [{ ...AUTO_DISPATCH_DEPT, workDays: [1, 2, 3, 4, 5], employees: [fridayEmployee] }],
      }),
    ])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])
    mockFindExistingTokensForDispatch.mockResolvedValue([])

    const result = await runHealthSurveyAutoDispatchScheduler()

    expect(result.triggered).toBe(1)
    expect(mockAddBulk).toHaveBeenCalledOnce()
    const [jobs] = mockAddBulk.mock.calls[0] as [{ opts?: { delay: number } }[]]
    expect(jobs[0]?.opts?.delay).toBe(334_800_000)

    vi.useRealTimers()
  })

  it("ignora colaborador sem dia útil nos próximos 7 dias — dispatch criado mas sem tokens nem mensagens", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-15T12:00:00-03:00"))

    const noWorkDaysEmployee = { ...EMPLOYEE, workDays: [] }
    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({
        respectEmployeeSchedule: true,
        departments: [{ ...AUTO_DISPATCH_DEPT, workDays: [], employees: [noWorkDaysEmployee] }],
      }),
    ])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])
    mockFindExistingTokensForDispatch.mockResolvedValue([])

    const result = await runHealthSurveyAutoDispatchScheduler()

    expect(result.triggered).toBe(1)
    expect(mockCreateHealthSurveyTokens).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
    expect(mockUpsertDeptDispatch).toHaveBeenCalledWith(expect.any(String), "dept-1", 1)

    vi.useRealTimers()
  })

  it("usa tokenExpiryHours para calcular expiresAt como scheduledSendAt + tokenExpiryHours quando respectEmployeeSchedule está ativo", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(WORK_DAY_TIMESTAMP))

    const fridayEmployee = {
      ...EMPLOYEE,
      workDays: [5],
      workStartTime: "09:00",
      workEndTime: "18:00",
    }
    mockFindActiveConfigs.mockResolvedValue([
      makeAutoDispatchConfig({
        respectEmployeeSchedule: true,
        tokenExpiryHours: 24,
        departments: [{ ...AUTO_DISPATCH_DEPT, workDays: [1, 2, 3, 4, 5], employees: [fridayEmployee] }],
      }),
    ])
    mockFindEmployeeIdsEligibleForDispatch.mockResolvedValue(["emp-1"])
    mockFindExistingTokensForDispatch.mockResolvedValue([])

    await runHealthSurveyAutoDispatchScheduler()

    const scheduledSendAt = new Date("2024-01-19T12:00:00.000Z")
    const expectedExpiresAt = new Date(scheduledSendAt.getTime() + 24 * 60 * 60 * 1000)
    expect(mockCreateHealthSurveyTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ expiresAt: expectedExpiresAt }),
      ]),
    )

    vi.useRealTimers()
  })
})

