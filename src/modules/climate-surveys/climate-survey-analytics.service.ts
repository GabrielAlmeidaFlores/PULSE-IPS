import { logger } from "@/libs/logger"
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
import {
  CLIMATE_SURVEY_ANALYTICS_EVENT,
  type ClimateSurveyFunnelMetrics,
  type ClimateSurveyQuestionAbandonmentRow,
  type ClimateSurveyResponseSessionRecord,
} from "@/modules/climate-surveys/climate-survey-analytics.types"
import { findClimateSurveyTokenByValue } from "@/modules/climate-surveys/climate-survey.repository"

function percentOrNull(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100)
}

function averageResponseTimeSeconds(sessions: ClimateSurveyResponseSessionRecord[]): number | null {
  const completed = sessions.filter((session) => session.completedAt !== null)
  if (completed.length === 0) return null
  const totalMs = completed.reduce((sum, session) => {
    const completedAt = session.completedAt
    if (completedAt === null) return sum
    return sum + (completedAt.getTime() - session.startedAt.getTime())
  }, 0)
  return Math.round(totalMs / completed.length / 1000)
}

function buildAbandonmentByQuestion(
  sessions: ClimateSurveyResponseSessionRecord[],
): ClimateSurveyQuestionAbandonmentRow[] {
  const starts = sessions.length
  if (starts === 0) return []

  const abandoned = sessions.filter((session) => session.completedAt === null)
  const counts = new Map<string, { questionOrder: number | null; questionId: string | null; abandonedCount: number }>()

  for (const session of abandoned) {
    const key =
      session.lastQuestionOrder === null
        ? "before_first"
        : `${String(session.lastQuestionOrder)}:${session.lastQuestionId ?? ""}`
    const existing = counts.get(key)
    if (existing !== undefined) {
      existing.abandonedCount += 1
      continue
    }
    counts.set(key, {
      questionOrder: session.lastQuestionOrder,
      questionId: session.lastQuestionId,
      abandonedCount: 1,
    })
  }

  return [...counts.values()]
    .map((row) => ({
      questionOrder: row.questionOrder,
      questionId: row.questionId,
      abandonedCount: row.abandonedCount,
      abandonmentPercentOfStarts: percentOrNull(row.abandonedCount, starts),
    }))
    .sort((a, b) => {
      if (a.questionOrder === null && b.questionOrder === null) return 0
      if (a.questionOrder === null) return -1
      if (b.questionOrder === null) return 1
      return a.questionOrder - b.questionOrder
    })
}

async function safeRecord(
  tenantId: string,
  fn: () => Promise<unknown>,
): Promise<void> {
  try {
    await fn()
  } catch (err) {
    logger.error({ err, tenantId }, "falha ao registrar evento de analytics de clima")
  }
}

export async function recordClimateSurveyCreated(
  tenantId: string,
  configId: string,
): Promise<void> {
  await safeRecord(tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.SURVEY_CREATED,
      configId,
    })
  })
}

export async function recordClimateSurveyQuestionsSelected(
  tenantId: string,
  configId: string,
  questions: { id: string; order: number }[],
): Promise<void> {
  await safeRecord(tenantId, async () => {
    await insertClimateSurveyAnalyticsEvents(
      tenantId,
      questions.map((question) => ({
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.QUESTION_SELECTED,
        configId,
        questionId: question.id,
        questionOrder: question.order,
      })),
    )
  })
}

export async function recordClimateSurveyCampaignDispatched(
  tenantId: string,
  dispatchId: string,
  configId?: string,
): Promise<void> {
  await safeRecord(tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.CAMPAIGN_DISPATCHED,
      dispatchId,
      ...(configId !== undefined ? { configId } : {}),
    })
  })
}

export async function recordClimateSurveyEmailOpened(input: {
  tenantId: string
  emailLogId: string
  dispatchId: string | null
}): Promise<void> {
  await safeRecord(input.tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(input.tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.EMAIL_OPENED,
      emailLogId: input.emailLogId,
      ...(input.dispatchId !== null ? { dispatchId: input.dispatchId } : {}),
    })
  })
}

export async function recordClimateSurveyLinkClicked(input: {
  tenantId: string
  emailLogId: string
  dispatchId: string | null
}): Promise<void> {
  await safeRecord(input.tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(input.tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.LINK_CLICKED,
      emailLogId: input.emailLogId,
      ...(input.dispatchId !== null ? { dispatchId: input.dispatchId } : {}),
    })
  })
}

export async function recordClimateSurveyReminderDispatched(
  tenantId: string,
  dispatchId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return
  await safeRecord(tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.REMINDER_DISPATCHED,
      dispatchId,
      quantity,
    })
  })
}

export async function recordClimateSurveyActionCreated(
  tenantId: string,
  actionPlanId: string,
  dispatchId: string,
): Promise<void> {
  await safeRecord(tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.ACTION_CREATED,
      actionPlanId,
      dispatchId,
    })
  })
}

export async function recordClimateSurveyActionCompleted(
  tenantId: string,
  actionPlanId: string,
  dispatchId: string,
): Promise<void> {
  await safeRecord(tenantId, async () => {
    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.ACTION_COMPLETED,
      actionPlanId,
      dispatchId,
    })
  })
}

export async function startClimateSurveyResponseSession(tokenValue: string): Promise<void> {
  const tokenRecord = await findClimateSurveyTokenByValue(tokenValue)
  if (tokenRecord === null) return
  if (tokenRecord.usedAt !== null) return
  if (tokenRecord.expiresAt < new Date()) return

  const tenantId = tokenRecord.tenantId
  await safeRecord(tenantId, async () => {
    const existing = await findClimateSurveyResponseSessionByTokenId(tenantId, tokenRecord.id)
    if (existing !== null) return

    const questionCount = tokenRecord.dispatch.climateSurveyConfiguration.questions.length
    const session = await createClimateSurveyResponseSession(tenantId, {
      dispatchId: tokenRecord.dispatchId,
      tokenId: tokenRecord.id,
      questionCount,
      startedAt: new Date(),
    })

    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.RESPONSE_STARTED,
      dispatchId: tokenRecord.dispatchId,
      sessionId: session.id,
    })
  })
}

export async function trackClimateSurveyResponseProgress(
  tokenValue: string,
  questionId: string,
  questionOrder: number,
): Promise<void> {
  const tokenRecord = await findClimateSurveyTokenByValue(tokenValue)
  if (tokenRecord === null) return

  const tenantId = tokenRecord.tenantId
  await safeRecord(tenantId, async () => {
    let session = await findClimateSurveyResponseSessionByTokenId(tenantId, tokenRecord.id)
    if (session === null) {
      const questionCount = tokenRecord.dispatch.climateSurveyConfiguration.questions.length
      session = await createClimateSurveyResponseSession(tenantId, {
        dispatchId: tokenRecord.dispatchId,
        tokenId: tokenRecord.id,
        questionCount,
        startedAt: new Date(),
      })
      await insertClimateSurveyAnalyticsEvent(tenantId, {
        event: CLIMATE_SURVEY_ANALYTICS_EVENT.RESPONSE_STARTED,
        dispatchId: tokenRecord.dispatchId,
        sessionId: session.id,
      })
    }

    if (session.completedAt !== null) return

    await updateClimateSurveyResponseSessionProgress(tenantId, session.id, {
      lastQuestionId: questionId,
      lastQuestionOrder: questionOrder,
    })
  })
}

export async function completeClimateSurveyResponseAnalytics(
  tenantId: string,
  tokenId: string,
  dispatchId: string,
): Promise<void> {
  await safeRecord(tenantId, async () => {
    const session = await completeClimateSurveyResponseSessionByTokenId(tenantId, tokenId, new Date())
    await insertClimateSurveyAnalyticsEvent(tenantId, {
      event: CLIMATE_SURVEY_ANALYTICS_EVENT.RESPONSE_COMPLETED,
      dispatchId,
      ...(session !== null ? { sessionId: session.id } : {}),
    })
  })
}

export async function getClimateSurveyFunnelMetrics(
  tenantId: string,
  dispatchId: string,
): Promise<ClimateSurveyFunnelMetrics> {
  const [emailCounts, totalRecipients, sessions] = await Promise.all([
    countClimateSurveyEmailFunnelByDispatch(tenantId, dispatchId),
    sumClimateSurveyDeptDispatchRecipients(tenantId, dispatchId),
    findClimateSurveyResponseSessionsByDispatch(tenantId, dispatchId),
  ])

  const responseStarts = sessions.length
  const responseCompletions = sessions.filter((session) => session.completedAt !== null).length

  return {
    dispatchId,
    emailsSent: emailCounts.sent,
    emailsOpened: emailCounts.opened,
    emailsClicked: emailCounts.clicked,
    openRatePercent: percentOrNull(emailCounts.opened, emailCounts.sent),
    clickRatePercent: percentOrNull(emailCounts.clicked, emailCounts.sent),
    totalRecipients,
    responseStarts,
    responseCompletions,
    startRatePercent: percentOrNull(responseStarts, totalRecipients),
    completionRatePercent: percentOrNull(responseCompletions, totalRecipients),
    averageResponseTimeSeconds: averageResponseTimeSeconds(sessions),
    abandonmentByQuestion: buildAbandonmentByQuestion(sessions),
  }
}

export function emptyClimateSurveyFunnelMetrics(): ClimateSurveyFunnelMetrics {
  return {
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
  }
}
