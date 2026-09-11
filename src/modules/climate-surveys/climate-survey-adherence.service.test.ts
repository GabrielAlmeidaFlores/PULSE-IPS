import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getClimateSurveyAdherenceOverview,
  triggerClimateSurveyReminderNow,
} from "@/modules/climate-surveys/climate-survey-adherence.service"
import {
  findClimateSurveyAdherenceDispatch,
  findClimateSurveyTokenChannelStats,
  findClimateSurveyTokensEligibleForManualReminder,
} from "@/modules/climate-surveys/climate-survey.repository"
import { sendClimateSurveyRemindersForDispatch } from "@/modules/climate-surveys/climate-survey-reminder.service"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/climate-surveys/climate-survey-reminder.service", () => ({
  sendClimateSurveyRemindersForDispatch: vi.fn(),
}))
vi.mock("@/modules/billing/billing.service")

const mockFindAdherenceDispatch = vi.mocked(findClimateSurveyAdherenceDispatch)
const mockFindTokenChannelStats = vi.mocked(findClimateSurveyTokenChannelStats)
const mockFindManualReminderTokens = vi.mocked(findClimateSurveyTokensEligibleForManualReminder)
const mockSendRemindersForDispatch = vi.mocked(sendClimateSurveyRemindersForDispatch)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)

const TENANT_ID = "tenant-1"
const DISPATCH_ID = "11111111-1111-1111-1111-111111111111"

function makeDispatch(
  overrides?: Partial<Awaited<ReturnType<typeof findClimateSurveyAdherenceDispatch>>>,
): NonNullable<Awaited<ReturnType<typeof findClimateSurveyAdherenceDispatch>>> {
  return {
    id: DISPATCH_ID,
    status: "available",
    scheduledAt: new Date("2026-08-01T12:00:00.000Z"),
    dispatchedAt: new Date("2026-08-01T12:05:00.000Z"),
    configName: "Clima Q3",
    sendViaMessaging: true,
    sendViaSignedLink: true,
    departments: [
      { id: "dept-1", name: "Vendas" },
      { id: "dept-2", name: "Ops" },
    ],
    deptDispatches: [
      { departmentId: "dept-1", totalRecipients: 10, totalResponses: 9 },
      { departmentId: "dept-2", totalRecipients: 10, totalResponses: 5 },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHasTenantPlanFeature.mockResolvedValue(true)
  mockFindTokenChannelStats.mockResolvedValue([])
  mockFindManualReminderTokens.mockResolvedValue([])
  mockSendRemindersForDispatch.mockResolvedValue(0)
})

describe("getClimateSurveyAdherenceOverview", () => {
  it("retorna overview vazio quando não há onda", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(null)

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.wave).toBeNull()
    expect(result.departments).toEqual([])
    expect(result.canSendReminderNow).toBe(false)
  })

  it("monta tabela por departamento com status Excelente, Boa e Reforçar", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(
      makeDispatch({
        deptDispatches: [
          { departmentId: "dept-1", totalRecipients: 10, totalResponses: 10 },
          { departmentId: "dept-2", totalRecipients: 10, totalResponses: 8 },
          { departmentId: "dept-3", totalRecipients: 10, totalResponses: 4 },
        ],
        departments: [
          { id: "dept-1", name: "Alpha" },
          { id: "dept-2", name: "Beta" },
          { id: "dept-3", name: "Gamma" },
        ],
      }),
    )

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.departments).toEqual([
      expect.objectContaining({ departmentName: "Alpha", adherencePercent: 100, statusLabel: "Excelente" }),
      expect.objectContaining({ departmentName: "Beta", adherencePercent: 80, statusLabel: "Boa" }),
      expect.objectContaining({ departmentName: "Gamma", adherencePercent: 40, statusLabel: "Reforçar" }),
    ])
    expect(result.reminderAreas.map((a) => a.departmentName)).toEqual(["Gamma"])
  })

  it("marca status Boa quando adesão está entre 75% e 89%", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(
      makeDispatch({
        departments: [{ id: "dept-1", name: "Vendas" }],
        deptDispatches: [{ departmentId: "dept-1", totalRecipients: 10, totalResponses: 8 }],
      }),
    )

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.departments[0]?.statusLabel).toBe("Boa")
    expect(result.reminderAreas).toHaveLength(0)
  })

  it("compara adesão por canal Mensagem e E-mail", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindTokenChannelStats.mockResolvedValue([
      { shortCode: "1234567", usedAt: new Date(), departmentId: "dept-1" },
      { shortCode: "7654321", usedAt: null, departmentId: "dept-1" },
      { shortCode: null, usedAt: new Date(), departmentId: "dept-2" },
      { shortCode: null, usedAt: null, departmentId: "dept-2" },
    ])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.channelComparison).toEqual([
      expect.objectContaining({ channel: "messaging", label: "Mensagem", totalRecipients: 2, totalResponses: 1, adherencePercent: 50 }),
      expect.objectContaining({ channel: "email", label: "E-mail", totalRecipients: 2, totalResponses: 1, adherencePercent: 50 }),
    ])
  })

  it("não usa adesão geral como fallback do canal E-mail quando não há tokens sem shortCode", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindTokenChannelStats.mockResolvedValue([
      { shortCode: "1234567", usedAt: new Date(), departmentId: "dept-1" },
      { shortCode: "7654321", usedAt: new Date(), departmentId: "dept-2" },
    ])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)
    const emailChannel = result.channelComparison.find((c) => c.channel === "email")

    expect(emailChannel).toMatchObject({
      totalRecipients: 0,
      totalResponses: 0,
      adherencePercent: 0,
    })
  })

  it("gera leitura comparando os canais quando os dois têm adesões diferentes", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindTokenChannelStats.mockResolvedValue([
      { shortCode: "1111111", usedAt: new Date(), departmentId: "dept-1" },
      { shortCode: "2222222", usedAt: new Date(), departmentId: "dept-1" },
      { shortCode: null, usedAt: new Date(), departmentId: "dept-2" },
      { shortCode: null, usedAt: null, departmentId: "dept-2" },
    ])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.channelReading).toBe(
      "Mensagem tem adesão 50 p.p. maior que E-mail nesta onda (100% contra 50%).",
    )
  })

  it("gera leitura de equivalência quando os canais têm a mesma adesão", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindTokenChannelStats.mockResolvedValue([
      { shortCode: "1111111", usedAt: new Date(), departmentId: "dept-1" },
      { shortCode: "2222222", usedAt: null, departmentId: "dept-1" },
      { shortCode: null, usedAt: new Date(), departmentId: "dept-2" },
      { shortCode: null, usedAt: null, departmentId: "dept-2" },
    ])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.channelReading).toBe("Mensagem e E-mail tiveram adesão equivalente nesta onda (50%).")
  })

  it("gera leitura de canal único quando só um canal foi usado", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindTokenChannelStats.mockResolvedValue([
      { shortCode: "1111111", usedAt: new Date(), departmentId: "dept-1" },
      { shortCode: "2222222", usedAt: null, departmentId: "dept-1" },
    ])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.channelReading).toBe("Somente Mensagem foi usado nesta onda (50% de adesão).")
  })

  it("não gera leitura quando nenhum canal teve destinatários", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindTokenChannelStats.mockResolvedValue([])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.channelReading).toBeNull()
  })

  it("habilita disparo de lembrete quando há tokens pendentes e feature messaging", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockFindManualReminderTokens.mockResolvedValue([
      {
        id: "token-1",
        tenantId: TENANT_ID,
        employeeId: "emp-1",
        dispatchId: DISPATCH_ID,
        expiresAt: new Date(Date.now() + 3600000),
        shortCode: "1234567",
        workStartTime: "09:00",
        workEndTime: "18:00",
        workDays: [1, 2, 3, 4, 5],
        tokenExpiryHours: 48,
        respectEmployeeSchedule: false,
        sendViaMessaging: true,
        sendViaSignedLink: true,
        orgTimezone: "America/Sao_Paulo",
        orgSlug: "acme",
        orgName: "Acme",
        employeeName: "Ana",
        employeePhone: "+5511999999999",
        employeeEmail: "ana@acme.com",
      },
    ])

    const result = await getClimateSurveyAdherenceOverview(TENANT_ID)

    expect(result.canSendReminderNow).toBe(true)
    expect(result.wave?.pendingReminderCount).toBe(1)
  })
})

describe("triggerClimateSurveyReminderNow", () => {
  it("lança AppError quando a onda não existe", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(null)

    await expect(triggerClimateSurveyReminderNow(TENANT_ID, DISPATCH_ID)).rejects.toMatchObject({
      code: "DISPATCH_NOT_FOUND",
    })
  })

  it("lança AppError quando a onda não está disponível", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch({ status: "scheduled" }))

    await expect(triggerClimateSurveyReminderNow(TENANT_ID, DISPATCH_ID)).rejects.toMatchObject({
      code: "DISPATCH_NOT_AVAILABLE",
    })
  })

  it("lança AppError quando nenhum canal de lembrete está disponível", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(
      makeDispatch({ sendViaMessaging: false, sendViaSignedLink: false }),
    )

    await expect(triggerClimateSurveyReminderNow(TENANT_ID, DISPATCH_ID)).rejects.toMatchObject({
      code: "NO_REMINDER_CHANNEL",
    })
  })

  it("permite lembrete só por e-mail mesmo sem feature messaging", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch({ sendViaMessaging: false, sendViaSignedLink: true }))
    mockHasTenantPlanFeature.mockResolvedValue(false)
    mockSendRemindersForDispatch.mockResolvedValue(2)

    const result = await triggerClimateSurveyReminderNow(TENANT_ID, DISPATCH_ID)

    expect(result).toEqual({ sentCount: 2 })
  })

  it("lança AppError quando não há pendentes", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockSendRemindersForDispatch.mockResolvedValue(0)

    await expect(triggerClimateSurveyReminderNow(TENANT_ID, DISPATCH_ID)).rejects.toMatchObject({
      code: "NO_PENDING_RESPONDENTS",
    })
  })

  it("retorna sentCount quando o lembrete é enfileirado", async () => {
    mockFindAdherenceDispatch.mockResolvedValue(makeDispatch())
    mockSendRemindersForDispatch.mockResolvedValue(3)

    const result = await triggerClimateSurveyReminderNow(TENANT_ID, DISPATCH_ID)

    expect(result).toEqual({ sentCount: 3 })
    expect(mockSendRemindersForDispatch).toHaveBeenCalledWith(TENANT_ID, DISPATCH_ID)
  })
})
