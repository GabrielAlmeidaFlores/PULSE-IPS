import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  runClimateSurveyResponseReminder,
  sendClimateSurveyRemindersForDispatch,
} from "@/modules/climate-surveys/climate-survey-reminder.service"
import {
  findAllTenantsTokensEligibleForReminderCheck,
  findClimateSurveyTokensEligibleForManualReminder,
  markClimateSurveyTokensReminderSent,
  type ReminderEligibleToken,
} from "@/modules/climate-surveys/climate-survey.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getDayOfWeekInTimezone, isAtWorkStartWindow } from "@/libs/utils/date"

const mockAddBulk = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockEmailAddBulk = vi.hoisted(() => vi.fn().mockResolvedValue([]))

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/billing/billing.service")
vi.mock("@/modules/climate-surveys/climate-survey-analytics.service", () => ({
  recordClimateSurveyReminderDispatched: vi.fn(),
}))
vi.mock("@/libs/queue", () => ({
  getMessageQueue: vi.fn(() => ({ addBulk: mockAddBulk })),
  getEmailQueue: vi.fn(() => ({ addBulk: mockEmailAddBulk })),
}))
vi.mock("@/libs/utils/date")
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }),
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
    EMAIL_PROVIDER: "console",
  },
}))

const mockFindEligibleTokens = vi.mocked(findAllTenantsTokensEligibleForReminderCheck)
const mockFindManualReminderTokens = vi.mocked(findClimateSurveyTokensEligibleForManualReminder)
const mockMarkReminderSent = vi.mocked(markClimateSurveyTokensReminderSent)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)
const mockGetDayOfWeekInTimezone = vi.mocked(getDayOfWeekInTimezone)
const mockIsAtWorkStartWindow = vi.mocked(isAtWorkStartWindow)

const TENANT_ID = "tenant-abc"
const DISPATCH_ID = "dispatch-1"
const ORG_TIMEZONE = "America/Sao_Paulo"
const NOW = Date.now()

function makeEligibleToken(overrides?: Partial<ReminderEligibleToken>): ReminderEligibleToken {
  return {
    id: "token-1",
    tenantId: TENANT_ID,
    employeeId: "emp-1",
    dispatchId: DISPATCH_ID,
    expiresAt: new Date(NOW + 1 * 60 * 60 * 1000),
    shortCode: "1234567",
    workStartTime: "09:00",
    workEndTime: "18:00",
    workDays: [1, 2, 3, 4, 5],
    tokenExpiryHours: 48,
    respectEmployeeSchedule: false,
    sendViaMessaging: true,
    sendViaSignedLink: true,
    orgTimezone: ORG_TIMEZONE,
    orgSlug: "acme",
    orgName: "Acme Corp",
    employeeName: "Ana Silva",
    employeePhone: "+5511999999999",
    employeeEmail: "ana@acme.com",
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddBulk.mockResolvedValue([])
  mockEmailAddBulk.mockResolvedValue([])
  mockMarkReminderSent.mockResolvedValue(undefined)
  mockHasTenantPlanFeature.mockResolvedValue(true)
  mockGetDayOfWeekInTimezone.mockReturnValue(1)
  mockIsAtWorkStartWindow.mockReturnValue(true)
  mockFindManualReminderTokens.mockResolvedValue([])
})

describe("runClimateSurveyResponseReminder — sem tokens", () => {
  it("retorna sem enfileirar quando não há tokens elegíveis", async () => {
    mockFindEligibleTokens.mockResolvedValue([])

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })
})

describe("runClimateSurveyResponseReminder — filtro de timing", () => {
  it("inclui token que está na janela de halfway (expiresAt em 1h, tokenExpiryHours=48)", async () => {
    const token = makeEligibleToken({
      expiresAt: new Date(NOW + 1 * 60 * 60 * 1000),
      tokenExpiryHours: 48,
    })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledWith([token.id])
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })

  it("ignora token antes da janela de halfway (expiresAt em 25h, tokenExpiryHours=48)", async () => {
    const token = makeEligibleToken({
      expiresAt: new Date(NOW + 25 * 60 * 60 * 1000),
      tokenExpiryHours: 48,
    })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })

  it("ignora token exatamente no limite de expiração (expiresAt = now)", async () => {
    const token = makeEligibleToken({
      expiresAt: new Date(NOW),
      tokenExpiryHours: 48,
    })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })
})

describe("runClimateSurveyResponseReminder — respectEmployeeSchedule=false", () => {
  it("não verifica getDayOfWeekInTimezone nem isAtWorkStartWindow quando flag é false", async () => {
    const token = makeEligibleToken({ respectEmployeeSchedule: false })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runClimateSurveyResponseReminder()

    expect(mockGetDayOfWeekInTimezone).not.toHaveBeenCalled()
    expect(mockIsAtWorkStartWindow).not.toHaveBeenCalled()
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })
})

describe("runClimateSurveyResponseReminder — respectEmployeeSchedule=true", () => {
  const scheduleToken = makeEligibleToken({
    respectEmployeeSchedule: true,
    workDays: [1, 2, 3, 4, 5],
    orgTimezone: ORG_TIMEZONE,
  })

  it("enfileira quando hoje é dia de trabalho e está na janela de início de turno", async () => {
    mockFindEligibleTokens.mockResolvedValue([scheduleToken])
    mockGetDayOfWeekInTimezone.mockReturnValue(1)
    mockIsAtWorkStartWindow.mockReturnValue(true)

    await runClimateSurveyResponseReminder()

    expect(mockGetDayOfWeekInTimezone).toHaveBeenCalledWith(ORG_TIMEZONE)
    expect(mockIsAtWorkStartWindow).toHaveBeenCalledWith(ORG_TIMEZONE, "09:00")
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })

  it("ignora quando hoje não é dia de trabalho", async () => {
    mockFindEligibleTokens.mockResolvedValue([scheduleToken])
    mockGetDayOfWeekInTimezone.mockReturnValue(0)

    await runClimateSurveyResponseReminder()

    expect(mockIsAtWorkStartWindow).not.toHaveBeenCalled()
    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })

  it("ignora quando hoje é dia de trabalho mas fora da janela de início de turno", async () => {
    mockFindEligibleTokens.mockResolvedValue([scheduleToken])
    mockGetDayOfWeekInTimezone.mockReturnValue(1)
    mockIsAtWorkStartWindow.mockReturnValue(false)

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })
})

describe("runClimateSurveyResponseReminder — feature gate de messaging", () => {
  it("envia apenas e-mail quando o plano não tem messaging", async () => {
    mockFindEligibleTokens.mockResolvedValue([makeEligibleToken()])
    mockHasTenantPlanFeature.mockResolvedValue(false)

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledWith(["token-1"])
    expect(mockAddBulk).not.toHaveBeenCalled()
    expect(mockEmailAddBulk).toHaveBeenCalledTimes(1)
  })

  it("não envia nada quando não há messaging nem e-mail no canal", async () => {
    mockFindEligibleTokens.mockResolvedValue([
      makeEligibleToken({ sendViaSignedLink: false, employeeEmail: null }),
    ])
    mockHasTenantPlanFeature.mockResolvedValue(false)

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
    expect(mockEmailAddBulk).not.toHaveBeenCalled()
  })

  it("processa apenas tenants com feature messaging no canal de mensagem quando há mistura", async () => {
    const tokenA = makeEligibleToken({ id: "t-a", tenantId: "tenant-a", sendViaSignedLink: false, employeeEmail: null })
    const tokenB = makeEligibleToken({ id: "t-b", tenantId: "tenant-b", sendViaSignedLink: false, employeeEmail: null })
    mockFindEligibleTokens.mockResolvedValue([tokenA, tokenB])
    mockHasTenantPlanFeature.mockImplementation((tenantId: string) => Promise.resolve(tenantId === "tenant-a"))

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledTimes(1)
    expect(mockMarkReminderSent).toHaveBeenCalledWith(["t-a"])
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })
})

describe("runClimateSurveyResponseReminder — idempotência", () => {
  it("chama markClimateSurveyTokensReminderSent ANTES de addBulk", async () => {
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

    await runClimateSurveyResponseReminder()

    expect(callOrder).toEqual(["mark", "enqueue"])
  })
})

describe("runClimateSurveyResponseReminder — payload do job", () => {
  it("enfileira job com tipo climate_survey_reminder e URL correta", async () => {
    const token = makeEligibleToken({ shortCode: "7654321", orgSlug: "acme", sendViaSignedLink: false, employeeEmail: null })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runClimateSurveyResponseReminder()

    expect(mockAddBulk).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "send-message",
          data: expect.objectContaining({
            type: "climate_survey_reminder",
            surveyLink: "http://localhost:3000/climate-survey/acme/7654321",
            recipientPhone: "+5511999999999",
            recipientName: "Ana Silva",
            tenantId: TENANT_ID,
            employeeId: "emp-1",
            dispatchId: DISPATCH_ID,
          }) as Record<string, unknown>,
        }),
      ]),
    )
  })

  it("enfileira e-mail com tracking via fila pulse-emails", async () => {
    const token = makeEligibleToken({ shortCode: "7654321", sendViaMessaging: false })
    mockFindEligibleTokens.mockResolvedValue([token])

    await runClimateSurveyResponseReminder()

    expect(mockAddBulk).not.toHaveBeenCalled()
    expect(mockEmailAddBulk).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "send-email",
          data: expect.objectContaining({
            type: "climate_survey_reminder",
            recipientEmail: "ana@acme.com",
            surveyLink: "http://localhost:3000/climate-survey/acme/7654321",
            dispatchId: DISPATCH_ID,
          }) as Record<string, unknown>,
        }),
      ]),
    )
  })

  it("enfileira um job por token quando há múltiplos tokens no mesmo tenant", async () => {
    const tokenA = makeEligibleToken({
      id: "t-a",
      employeeId: "emp-a",
      shortCode: "1111111",
      sendViaSignedLink: false,
      employeeEmail: null,
    })
    const tokenB = makeEligibleToken({
      id: "t-b",
      employeeId: "emp-b",
      shortCode: "2222222",
      sendViaSignedLink: false,
      employeeEmail: null,
    })
    mockFindEligibleTokens.mockResolvedValue([tokenA, tokenB])

    await runClimateSurveyResponseReminder()

    expect(mockMarkReminderSent).toHaveBeenCalledWith(["t-a", "t-b"])
    const [bulkArg] = mockAddBulk.mock.calls[0] as [unknown[]]
    expect(bulkArg).toHaveLength(2)
  })
})

describe("runClimateSurveyResponseReminder — múltiplos tenants", () => {
  it("processa cada tenant em batch separado", async () => {
    const tokenA = makeEligibleToken({ id: "t-a", tenantId: "tenant-a" })
    const tokenB = makeEligibleToken({ id: "t-b", tenantId: "tenant-b" })
    mockFindEligibleTokens.mockResolvedValue([tokenA, tokenB])

    await runClimateSurveyResponseReminder()

    expect(mockHasTenantPlanFeature).toHaveBeenCalledTimes(2)
    expect(mockMarkReminderSent).toHaveBeenCalledTimes(2)
    expect(mockAddBulk).toHaveBeenCalledTimes(2)
  })
})

describe("sendClimateSurveyRemindersForDispatch", () => {
  it("retorna 0 sem enfileirar quando não há tokens pendentes", async () => {
    mockFindManualReminderTokens.mockResolvedValue([])

    const sentCount = await sendClimateSurveyRemindersForDispatch(TENANT_ID, DISPATCH_ID)

    expect(sentCount).toBe(0)
    expect(mockMarkReminderSent).not.toHaveBeenCalled()
    expect(mockAddBulk).not.toHaveBeenCalled()
  })

  it("marca e enfileira lembretes manuais da onda", async () => {
    const token = makeEligibleToken({
      id: "manual-1",
      shortCode: "9999999",
      sendViaSignedLink: false,
      employeeEmail: null,
    })
    mockFindManualReminderTokens.mockResolvedValue([token])

    const sentCount = await sendClimateSurveyRemindersForDispatch(TENANT_ID, DISPATCH_ID)

    expect(sentCount).toBe(1)
    expect(mockFindManualReminderTokens).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)
    expect(mockMarkReminderSent).toHaveBeenCalledWith(["manual-1"])
    expect(mockAddBulk).toHaveBeenCalledTimes(1)
  })
})
