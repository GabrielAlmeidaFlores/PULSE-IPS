import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getClimateSurveyFunnelMetrics,
  recordClimateSurveyCreated,
  recordClimateSurveyQuestionsSelected,
  recordClimateSurveyCampaignDispatched,
  recordClimateSurveyReminderDispatched,
  completeClimateSurveyResponseAnalytics,
  startClimateSurveyResponseSession,
  trackClimateSurveyResponseProgress,
} from "@/modules/climate-surveys/climate-survey-analytics.service"
import {
  completeClimateSurveyResponseSessionByTokenId,
  countClimateSurveyEmailFunnelByDispatch,
  createClimateSurveyResponseSession,
  findClimateSurveyResponseSessionByTokenId,
  findClimateSurveyResponseSessionsByDispatch,
  insertClimateSurveyAnalyticsEvent,
  insertClimateSurveyAnalyticsEvents,
  sumClimateSurveyDeptDispatchRecipients,
  updateClimateSurveyResponseSessionProgress,
} from "@/modules/climate-surveys/climate-survey-analytics.repository"
import { findClimateSurveyTokenByValue } from "@/modules/climate-surveys/climate-survey.repository"
import { CLIMATE_SURVEY_ANALYTICS_EVENT } from "@/modules/climate-surveys/climate-survey-analytics.types"

vi.mock("@/modules/climate-surveys/climate-survey-analytics.repository")
vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/libs/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))
vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}))

const mockInsertEvent = vi.mocked(insertClimateSurveyAnalyticsEvent)
const mockInsertEvents = vi.mocked(insertClimateSurveyAnalyticsEvents)
const mockCountEmails = vi.mocked(countClimateSurveyEmailFunnelByDispatch)
const mockSumRecipients = vi.mocked(sumClimateSurveyDeptDispatchRecipients)
const mockFindSessions = vi.mocked(findClimateSurveyResponseSessionsByDispatch)
const mockFindSessionByToken = vi.mocked(findClimateSurveyResponseSessionByTokenId)
const mockCreateSession = vi.mocked(createClimateSurveyResponseSession)
const mockUpdateProgress = vi.mocked(updateClimateSurveyResponseSessionProgress)
const mockCompleteSession = vi.mocked(completeClimateSurveyResponseSessionByTokenId)
const mockFindToken = vi.mocked(findClimateSurveyTokenByValue)

const TENANT_ID = "tenant-1"
const DISPATCH_ID = "dispatch-1"
const TOKEN_ID = "token-1"
const SESSION_ID = "session-1"

beforeEach(() => {
  vi.clearAllMocks()
  mockInsertEvent.mockResolvedValue({
    id: "evt-1",
    tenantId: TENANT_ID,
    event: CLIMATE_SURVEY_ANALYTICS_EVENT.SURVEY_CREATED,
    configId: "cfg-1",
    dispatchId: null,
    actionPlanId: null,
    questionId: null,
    questionOrder: null,
    emailLogId: null,
    sessionId: null,
    quantity: 1,
    createdAt: new Date(),
  })
  mockInsertEvents.mockResolvedValue(undefined)
  mockCountEmails.mockResolvedValue({ sent: 10, opened: 4, clicked: 2 })
  mockSumRecipients.mockResolvedValue(20)
  mockFindSessions.mockResolvedValue([])
  mockFindSessionByToken.mockResolvedValue(null)
  mockCreateSession.mockResolvedValue({
    id: SESSION_ID,
    tenantId: TENANT_ID,
    dispatchId: DISPATCH_ID,
    tokenId: TOKEN_ID,
    startedAt: new Date("2026-01-01T10:00:00Z"),
    completedAt: null,
    lastQuestionId: null,
    lastQuestionOrder: null,
    questionCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  mockUpdateProgress.mockResolvedValue(null)
  mockCompleteSession.mockResolvedValue({
    id: SESSION_ID,
    tenantId: TENANT_ID,
    dispatchId: DISPATCH_ID,
    tokenId: TOKEN_ID,
    startedAt: new Date("2026-01-01T10:00:00Z"),
    completedAt: new Date("2026-01-01T10:05:00Z"),
    lastQuestionId: "q-3",
    lastQuestionOrder: 3,
    questionCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
})

describe("recordClimateSurveyCreated", () => {
  it("grava evento pesquisa_criada", async () => {
    await recordClimateSurveyCreated(TENANT_ID, "cfg-1")
    expect(mockInsertEvent).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.SURVEY_CREATED,
        configId: "cfg-1",
      }),
    )
  })
})

describe("recordClimateSurveyQuestionsSelected", () => {
  it("grava um evento por pergunta", async () => {
    await recordClimateSurveyQuestionsSelected(TENANT_ID, "cfg-1", [
      { id: "q-1", order: 1 },
      { id: "q-2", order: 2 },
    ])
    expect(mockInsertEvents).toHaveBeenCalledWith(
      TENANT_ID,
      expect.arrayContaining([
        expect.objectContaining({
          event: CLIMATE_SURVEY_ANALYTICS_EVENT.QUESTION_SELECTED,
          questionId: "q-1",
        }),
        expect.objectContaining({
          event: CLIMATE_SURVEY_ANALYTICS_EVENT.QUESTION_SELECTED,
          questionId: "q-2",
        }),
      ]),
    )
  })
})

describe("recordClimateSurveyCampaignDispatched", () => {
  it("grava campanha_disparada", async () => {
    await recordClimateSurveyCampaignDispatched(TENANT_ID, DISPATCH_ID, "cfg-1")
    expect(mockInsertEvent).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.CAMPAIGN_DISPATCHED,
        dispatchId: DISPATCH_ID,
        configId: "cfg-1",
      }),
    )
  })
})

describe("recordClimateSurveyReminderDispatched", () => {
  it("não grava quando quantity é zero", async () => {
    await recordClimateSurveyReminderDispatched(TENANT_ID, DISPATCH_ID, 0)
    expect(mockInsertEvent).not.toHaveBeenCalled()
  })

  it("grava lembrete_disparado com quantity", async () => {
    await recordClimateSurveyReminderDispatched(TENANT_ID, DISPATCH_ID, 7)
    expect(mockInsertEvent).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.REMINDER_DISPATCHED,
        quantity: 7,
      }),
    )
  })
})

describe("startClimateSurveyResponseSession", () => {
  it("cria sessão e evento resposta_iniciada", async () => {
    mockFindToken.mockResolvedValue({
      id: TOKEN_ID,
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      usedAt: null,
      expiresAt: new Date("2099-01-01"),
      dispatch: {
        climateSurveyConfiguration: {
          questions: [{ id: "q-1" }, { id: "q-2" }],
        },
      },
    } as Awaited<ReturnType<typeof findClimateSurveyTokenByValue>>)

    await startClimateSurveyResponseSession("token-value")

    expect(mockCreateSession).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        dispatchId: DISPATCH_ID,
        tokenId: TOKEN_ID,
        questionCount: 2,
      }),
    )
    expect(mockInsertEvent).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.RESPONSE_STARTED,
        sessionId: SESSION_ID,
      }),
    )
  })

  it("não cria sessão duplicada", async () => {
    mockFindToken.mockResolvedValue({
      id: TOKEN_ID,
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      usedAt: null,
      expiresAt: new Date("2099-01-01"),
      dispatch: {
        climateSurveyConfiguration: { questions: [{ id: "q-1" }] },
      },
    } as Awaited<ReturnType<typeof findClimateSurveyTokenByValue>>)
    mockFindSessionByToken.mockResolvedValue({
      id: SESSION_ID,
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      tokenId: TOKEN_ID,
      startedAt: new Date(),
      completedAt: null,
      lastQuestionId: null,
      lastQuestionOrder: null,
      questionCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await startClimateSurveyResponseSession("token-value")

    expect(mockCreateSession).not.toHaveBeenCalled()
  })
})

describe("trackClimateSurveyResponseProgress", () => {
  it("atualiza última pergunta da sessão", async () => {
    mockFindToken.mockResolvedValue({
      id: TOKEN_ID,
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      usedAt: null,
      expiresAt: new Date("2099-01-01"),
      dispatch: {
        climateSurveyConfiguration: { questions: [{ id: "q-1" }] },
      },
    } as Awaited<ReturnType<typeof findClimateSurveyTokenByValue>>)
    mockFindSessionByToken.mockResolvedValue({
      id: SESSION_ID,
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      tokenId: TOKEN_ID,
      startedAt: new Date(),
      completedAt: null,
      lastQuestionId: null,
      lastQuestionOrder: null,
      questionCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await trackClimateSurveyResponseProgress("token-value", "q-1", 1)

    expect(mockUpdateProgress).toHaveBeenCalledWith(TENANT_ID, SESSION_ID, {
      lastQuestionId: "q-1",
      lastQuestionOrder: 1,
    })
  })
})

describe("completeClimateSurveyResponseAnalytics", () => {
  it("completa sessão e grava resposta_concluida", async () => {
    await completeClimateSurveyResponseAnalytics(TENANT_ID, TOKEN_ID, DISPATCH_ID)

    expect(mockCompleteSession).toHaveBeenCalledWith(TENANT_ID, TOKEN_ID, expect.any(Date) as Date)
    expect(mockInsertEvent).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.RESPONSE_COMPLETED,
        dispatchId: DISPATCH_ID,
        sessionId: SESSION_ID,
      }),
    )
  })
})

describe("getClimateSurveyFunnelMetrics", () => {
  it("calcula taxas de abertura, clique, início e conclusão", async () => {
    mockFindSessions.mockResolvedValue([
      {
        id: "s-1",
        tenantId: TENANT_ID,
        dispatchId: DISPATCH_ID,
        tokenId: "t-1",
        startedAt: new Date("2026-01-01T10:00:00Z"),
        completedAt: new Date("2026-01-01T10:02:00Z"),
        lastQuestionId: "q-2",
        lastQuestionOrder: 2,
        questionCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "s-2",
        tenantId: TENANT_ID,
        dispatchId: DISPATCH_ID,
        tokenId: "t-2",
        startedAt: new Date("2026-01-01T11:00:00Z"),
        completedAt: null,
        lastQuestionId: "q-1",
        lastQuestionOrder: 1,
        questionCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "s-3",
        tenantId: TENANT_ID,
        dispatchId: DISPATCH_ID,
        tokenId: "t-3",
        startedAt: new Date("2026-01-01T12:00:00Z"),
        completedAt: null,
        lastQuestionId: null,
        lastQuestionOrder: null,
        questionCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const metrics = await getClimateSurveyFunnelMetrics(TENANT_ID, DISPATCH_ID)

    expect(metrics.openRatePercent).toBe(40)
    expect(metrics.clickRatePercent).toBe(20)
    expect(metrics.startRatePercent).toBe(15)
    expect(metrics.completionRatePercent).toBe(5)
    expect(metrics.averageResponseTimeSeconds).toBe(120)
    expect(metrics.abandonmentByQuestion).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questionOrder: null, abandonedCount: 1 }),
        expect.objectContaining({ questionOrder: 1, abandonedCount: 1 }),
      ]),
    )
  })

  it("retorna null para taxas quando denominador é zero", async () => {
    mockCountEmails.mockResolvedValue({ sent: 0, opened: 0, clicked: 0 })
    mockSumRecipients.mockResolvedValue(0)

    const metrics = await getClimateSurveyFunnelMetrics(TENANT_ID, DISPATCH_ID)

    expect(metrics.openRatePercent).toBeNull()
    expect(metrics.clickRatePercent).toBeNull()
    expect(metrics.startRatePercent).toBeNull()
    expect(metrics.completionRatePercent).toBeNull()
    expect(metrics.averageResponseTimeSeconds).toBeNull()
  })
})
