import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AppError } from "@/libs/errors/app-error"
import {
  findSurveyConfigsByTenant,
  findSurveyConfigById,
  upsertSurveyConfig,
  findDispatchesByTenant,
  findDispatchWithDashboard,
  findMultipleDispatchesWithDashboard,
  createDispatch,
  findTokenByValue,
  deleteExpiredTokens,
  createSurveyResponseWithItems,
} from "@/modules/surveys/survey.repository"
import { getCurrentConsent, getActiveConsentTermVersion } from "@/modules/consent/consent.repository"
import type { CreateSurveyConfigInput, SubmitSurveyInput, SurveyTokenValidation, DispatchDashboardStats, ScoreDirection } from "@/modules/surveys/survey.types"
export type { DispatchWithConfig } from "@/modules/surveys/survey.repository"

function normalizeScore(raw: number, direction: string): number {
  return direction === "lower_is_better" ? 6 - raw : raw
}

function toScoreDirection(value: string): ScoreDirection {
  return value === "lower_is_better" ? "lower_is_better" : "higher_is_better"
}

export function getSurveyConfigs(tenantId: string): ReturnType<typeof findSurveyConfigsByTenant> {
  return findSurveyConfigsByTenant(tenantId)
}

export function getSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findSurveyConfigById> {
  return findSurveyConfigById(tenantId, configId)
}

export function configureSurvey(tenantId: string, input: CreateSurveyConfigInput): ReturnType<typeof upsertSurveyConfig> {
  return upsertSurveyConfig(tenantId, input)
}

export function getDispatches(tenantId: string): ReturnType<typeof findDispatchesByTenant> {
  return findDispatchesByTenant(tenantId)
}

export function scheduleDispatch(tenantId: string, configId: string, scheduledAt: Date): ReturnType<typeof createDispatch> {
  return createDispatch(tenantId, configId, scheduledAt)
}

export async function validateSurveyToken(token: string): Promise<SurveyTokenValidation> {
  const tokenRecord = await findTokenByValue(token)
  if (!tokenRecord) return { valid: false, error: "Link inválido ou expirado." }
  if (tokenRecord.usedAt) return { valid: false, error: "Esta pesquisa já foi respondida." }
  if (tokenRecord.expiresAt < new Date()) return { valid: false, error: "Este link expirou." }

  const timezone = tokenRecord.dispatch.surveyConfiguration.organization.timezone ?? "America/Sao_Paulo"
  const now = toZonedTime(new Date(), timezone)
  const currentTime = format(now, "HH:mm")
  if (currentTime < tokenRecord.workStartTime || currentTime > tokenRecord.workEndTime) {
    return { valid: false, error: "Pesquisa disponível apenas no horário de trabalho." }
  }

  if (tokenRecord.dispatch.status !== "sent") {
    return { valid: false, error: "Esta pesquisa não está ativa." }
  }

  const [currentConsent, activeTermVersion] = await Promise.all([
    getCurrentConsent(tokenRecord.tenantId, tokenRecord.employeeId),
    getActiveConsentTermVersion(),
  ])

  const hasAcceptedCurrentVersion =
    currentConsent?.event === "accepted" &&
    currentConsent?.consentTermVersionId === activeTermVersion?.id

  return {
    valid: true,
    employeeName: tokenRecord.employee.name,
    consentStatus: hasAcceptedCurrentVersion ? "accepted" : "needs_consent",
    consentTermVersionId: activeTermVersion?.id ?? null,
    consentTermContent: hasAcceptedCurrentVersion ? null : (activeTermVersion?.content ?? null),
    token: {
      id: tokenRecord.id,
      dispatchId: tokenRecord.dispatchId,
      employeeId: tokenRecord.employeeId,
      workStartTime: tokenRecord.workStartTime,
      workEndTime: tokenRecord.workEndTime,
      tenantId: tokenRecord.tenantId,
    },
    questions: tokenRecord.dispatch.surveyConfiguration.questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
    })),
    timezone,
  }
}

export function cleanupExpiredTokens(): Promise<{ count: number }> {
  return deleteExpiredTokens()
}

export async function getMultipleDispatchDashboards(
  tenantId: string,
  dispatchIds: string[],
): Promise<DispatchDashboardStats[]> {
  const dataList = await findMultipleDispatchesWithDashboard(tenantId, dispatchIds)
  return dataList.map((data) => {
    const notResponded = Math.max(0, data.totalRecipients - data.totalResponses)
    const adherenceRate = data.totalRecipients > 0 ? data.totalResponses / data.totalRecipients : 0
    const questions = data.questions.map((q) => {
      const direction = toScoreDirection(q.scoreDirection)
      const qScores = data.responseItems.filter((i) => i.questionId === q.id).map((i) => normalizeScore(i.score, direction))
      const qAvg = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null
      const rawScores = data.responseItems.filter((i) => i.questionId === q.id).map((i) => i.score)
      const distribution = [1, 2, 3, 4, 5].map((s) => ({
        score: s,
        count: rawScores.filter((v) => v === s).length,
      }))
      return { ...q, scoreDirection: direction, avgScore: qAvg, distribution }
    })
    const allNormalizedScores = questions.flatMap((q) =>
      data.responseItems.filter((i) => i.questionId === q.id).map((i) => normalizeScore(i.score, q.scoreDirection)),
    )
    const avgScore = allNormalizedScores.length > 0 ? allNormalizedScores.reduce((a, b) => a + b, 0) / allNormalizedScores.length : null
    return {
      id: data.id,
      departmentId: data.departmentId,
      status: data.status,
      scheduledAt: data.scheduledAt,
      dispatchedAt: data.dispatchedAt,
      departmentName: data.departmentName,
      frequency: data.frequency,
      totalRecipients: data.totalRecipients,
      totalResponses: data.totalResponses,
      notResponded,
      adherenceRate,
      avgScore,
      questions,
    }
  })
}

export async function submitSurveyResponse(input: SubmitSurveyInput): Promise<void> {
  const tokenRecord = await findTokenByValue(input.token)
  if (!tokenRecord) throw new AppError("TOKEN_INVALID", "Token inválido.")
  if (tokenRecord.usedAt) throw new AppError("SURVEY_ALREADY_ANSWERED", "Esta pesquisa já foi respondida.")
  if (tokenRecord.expiresAt < new Date()) throw new AppError("TOKEN_EXPIRED", "Este link expirou.")

  await createSurveyResponseWithItems({
    tenantId: tokenRecord.tenantId,
    dispatchId: tokenRecord.dispatchId,
    tokenId: tokenRecord.id,
    answers: input.answers,
  })
}

export async function getDispatchDashboard(tenantId: string, dispatchId: string): Promise<DispatchDashboardStats | null> {
  const data = await findDispatchWithDashboard(tenantId, dispatchId)
  if (!data) return null

  const notResponded = Math.max(0, data.totalRecipients - data.totalResponses)
  const adherenceRate = data.totalRecipients > 0 ? data.totalResponses / data.totalRecipients : 0

  const questions = data.questions.map((q) => {
    const direction = toScoreDirection(q.scoreDirection)
    const qScores = data.responseItems.filter((i) => i.questionId === q.id).map((i) => normalizeScore(i.score, direction))
    const qAvg = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null
    const rawScores = data.responseItems.filter((i) => i.questionId === q.id).map((i) => i.score)
    const distribution = [1, 2, 3, 4, 5].map((s) => ({
      score: s,
      count: rawScores.filter((v) => v === s).length,
    }))
    return { ...q, scoreDirection: direction, avgScore: qAvg, distribution }
  })

  const allNormalizedScores = questions.flatMap((q) =>
    data.responseItems.filter((i) => i.questionId === q.id).map((i) => normalizeScore(i.score, q.scoreDirection)),
  )
  const avgScore = allNormalizedScores.length > 0 ? allNormalizedScores.reduce((a, b) => a + b, 0) / allNormalizedScores.length : null

  return {
    id: data.id,
    departmentId: data.departmentId,
    status: data.status,
    scheduledAt: data.scheduledAt,
    dispatchedAt: data.dispatchedAt,
    departmentName: data.departmentName,
    frequency: data.frequency,
    totalRecipients: data.totalRecipients,
    totalResponses: data.totalResponses,
    notResponded,
    adherenceRate,
    avgScore,
    questions,
  }
}
