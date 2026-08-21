import { describe, it, expect, vi, beforeEach } from "vitest"
import { runHealthSurveyResponseReminder } from "@/modules/health-surveys/health-survey-reminder.service"
import {
  findAllTenantsTokensEligibleForReminderCheck,
  markHealthSurveyTokensReminderSent,
  type ReminderEligibleToken,
} from "@/modules/health-surveys/health-survey.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getDayOfWeekInTimezone, isAtWorkStartWindow } from "@/libs/utils/date"

const mockAddBulk = vi.hoisted(() => vi.fn().mockResolvedValue([]))

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/billing/billing.service")
vi.mock("@/libs/queue", () => ({ getMessageQueue: vi.fn(() => ({ addBulk: mockAddBulk })) }))
vi.mock("@/libs/utils/date")
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }),
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
  },
}))

const mockFindEligibleTokens = vi.mocked(findAllTenantsTokensEligibleForReminderCheck)
const mockMarkReminderSent = vi.mocked(markHealthSurveyTokensReminderSent)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)
const mockGetDayOfWeekInTimezone = vi.mocked(getDayOfWeekInTimezone)
const mockIsAtWorkStartWindow = vi.mocked(isAtWorkStartWindow)

const TENANT_ID = "tenant-abc"
const ORG_TIMEZONE = "America/Sao_Paulo"
const NOW = Date.now()

function makeEligibleToken(overrides?: Partial<ReminderEligibleToken>): ReminderEligibleToken {
  return {
    id: "token-1",
    tenantId: TENANT_ID,
    employeeId: "emp-1",
    dispatchId: "dispatch-1",
    expiresAt: new Date(NOW + 1 * 60 * 60 * 1000),
    shortCode: "1234567",
    workStartTime: "09:00",
    workEndTime: "18:00",
    workDays: [1, 2, 3, 4, 5],
    tokenExpiryHours: 48,
    respectEmployeeSchedule: false,
    orgTimezone: ORG_TIMEZONE,
    orgSlug: "acme",
    orgName: "Acme Corp",
    employeeName: "Ana Silva",
    employeePhone: "+5511999999999",
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddBulk.mockResolvedValue([])
  mockMarkReminderSent.mockResolvedValue(undefined)
  mockHasTenantPlanFeature.mockResolvedValue(true)
  mockGetDayOfWeekInTimezone.mockReturnValue(1)
  mockIsAtWorkStartWindow.mockReturnValue(true)
})

describe("runHealthSurveyResponseReminder — sem tokens", () => {
  it("retorna sem enfileirar quando não há tokens elegíveis", async () => {
    mockFindEligibleTokens.mockResolvedValue([])

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })
})

describe("runHealthSurveyResponseReminder — filtro de timing", () => {
  it("inclui token que está na janela de halfway (expiresAt em 1h, tokenExpiryHours=48)", async () => {
    const token = makeEligibleToken({
      expiresAt: new Date(NOW + 1 * 60 * 60 * 1000),
      tokenExpiryHours: 48,
    })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledWith([token.id])
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })

  it("ignora token antes da janela de halfway (expiresAt em 25h, tokenExpiryHours=48)", async () => {
    const token = makeEligibleToken({
      expiresAt: new Date(NOW + 25 * 60 * 60 * 1000),
      tokenExpiryHours: 48,
    })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })

  it("ignora token exatamente no limite de expiração (expiresAt = now)", async () => {
    const token = makeEligibleToken({
      expiresAt: new Date(NOW),
      tokenExpiryHours: 48,
    })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })
})

describe("runHealthSurveyResponseReminder — respectEmployeeSchedule=false", () => {
  it("não verifica getDayOfWeekInTimezone nem isAtWorkStartWindow quando flag é false", async () => {
    const token = makeEligibleToken({ respectEmployeeSchedule: false })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runHealthSurveyResponseReminder()

    expect(mockGetDayOfWeekInTimezone).not.toHaveBeenCalled()
    expect(mockIsAtWorkStartWindow).not.toHaveBeenCalled()
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })
})

describe("runHealthSurveyResponseReminder — respectEmployeeSchedule=true", () => {
  const scheduleToken = makeEligibleToken({
    respectEmployeeSchedule: true,
    workDays: [1, 2, 3, 4, 5],
    orgTimezone: ORG_TIMEZONE,
  })

  it("enfileira quando hoje é dia de trabalho e está na janela de início de turno", async () => {
    mockFindEligibleTokens.mockResolvedValue([scheduleToken])
    mockGetDayOfWeekInTimezone.mockReturnValue(1)
    mockIsAtWorkStartWindow.mockReturnValue(true)

    await runHealthSurveyResponseReminder()

    expect(mockGetDayOfWeekInTimezone).toHaveBeenCalledWith(ORG_TIMEZONE)
    expect(mockIsAtWorkStartWindow).toHaveBeenCalledWith(ORG_TIMEZONE, "09:00")
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })

  it("ignora quando hoje não é dia de trabalho", async () => {
    mockFindEligibleTokens.mockResolvedValue([scheduleToken])
    mockGetDayOfWeekInTimezone.mockReturnValue(0)

    await runHealthSurveyResponseReminder()

    expect(mockIsAtWorkStartWindow).not.toHaveBeenCalled()
    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })

  it("ignora quando hoje é dia de trabalho mas fora da janela de início de turno", async () => {
    mockFindEligibleTokens.mockResolvedValue([scheduleToken])
    mockGetDayOfWeekInTimezone.mockReturnValue(1)
    mockIsAtWorkStartWindow.mockReturnValue(false)

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })
})

describe("runHealthSurveyResponseReminder — feature gate de messaging", () => {
  it("ignora tenant sem feature messaging", async () => {
    mockFindEligibleTokens.mockResolvedValue([makeEligibleToken()])
    mockHasTenantPlanFeature.mockResolvedValue(false)

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })

  it("processa apenas tenants com feature messaging quando há mistura", async () => {
    const tokenA = makeEligibleToken({ id: "t-a", tenantId: "tenant-a" })
    const tokenB = makeEligibleToken({ id: "t-b", tenantId: "tenant-b" })
    mockFindEligibleTokens.mockResolvedValue([tokenA, tokenB])
    mockHasTenantPlanFeature.mockImplementation((tenantId: string) => Promise.resolve(tenantId === "tenant-a"))

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledTimes(1)
    expect(mockMarkReminderSent).toHaveBeenCalledWith(["t-a"])
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })
})

describe("runHealthSurveyResponseReminder — idempotência", () => {
  it("chama markHealthSurveyTokensReminderSent ANTES de addBulk", async () => {
    const callOrder: string[] = []
    mockMarkReminderSent.mockImplementation(() => {
      callOrder.push("mark")
      return Promise.resolve(undefined)
    })
    mockAddBulk.mockImplementation(() => {
      callOrder.push("enqueue")
      return Promise.resolve([])
    })
    mockFindEligibleTokens.mockResolvedValue([makeEligibleToken()])

    await runHealthSurveyResponseReminder()

    expect(callOrder).toEqual(["mark", "enqueue"])
  })
})

describe("runHealthSurveyResponseReminder — payload do job", () => {
  it("enfileira job com tipo health_survey_reminder e URL correta", async () => {
    const token = makeEligibleToken({ shortCode: "7654321", orgSlug: "acme" })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runHealthSurveyResponseReminder()

    expect(mockAddBulk).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "send-message",
          data: expect.objectContaining({
            type: "health_survey_reminder",
            surveyLink: "http://localhost:3000/health-survey/acme/7654321",
            recipientPhone: "+5511999999999",
            recipientName: "Ana Silva",
            tenantId: TENANT_ID,
            employeeId: "emp-1",
            dispatchId: "dispatch-1",
          }) as Record<string, unknown>,
        }),
      ]),
    )
  })

  it("enfileira um job por token quando há múltiplos tokens no mesmo tenant", async () => {
    const tokenA = makeEligibleToken({ id: "t-a", employeeId: "emp-a", shortCode: "1111111" })
    const tokenB = makeEligibleToken({ id: "t-b", employeeId: "emp-b", shortCode: "2222222" })
    mockFindEligibleTokens.mockResolvedValue([tokenA, tokenB])

    await runHealthSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledWith(["t-a", "t-b"])
    const [bulkArg] = mockAddBulk.mock.calls[0] as [unknown[]]
    expect(bulkArg).toHaveLength(2)
  })
})

describe("runHealthSurveyResponseReminder — múltiplos tenants", () => {
  it("processa cada tenant em batch separado", async () => {
    const tokenA = makeEligibleToken({ id: "t-a", tenantId: "tenant-a" })
    const tokenB = makeEligibleToken({ id: "t-b", tenantId: "tenant-b" })
    mockFindEligibleTokens.mockResolvedValue([tokenA, tokenB])

    await runHealthSurveyResponseReminder()

    expect(mockHasTenantPlanFeature).toHaveBeenCalledTimes(2)
    expect(mockMarkReminderSent).toHaveBeenCalledTimes(2)
    expect(mockAddBulk).toHaveBeenCalledTimes(2)
  })
})
