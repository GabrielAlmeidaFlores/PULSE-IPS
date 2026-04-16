import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AppError } from "@/libs/errors/app-error"
import {
  findSurveyConfigsByTenant,
  findSurveyConfigById,
  upsertSurveyConfig,
  findDispatchesByTenant,
  createDispatch,
  findTokenByValue,
  deleteExpiredTokens,
  createSurveyResponseWithItems,
} from "@/modules/surveys/survey.repository"
import type { CreateSurveyConfigInput, SubmitSurveyInput, SurveyTokenValidation } from "@/modules/surveys/survey.types"

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
  if (!tokenRecord) return { valid: false, error: "Token inválido" }
  if (tokenRecord.usedAt) return { valid: false, error: "Esta pesquisa já foi respondida" }
  if (tokenRecord.expiresAt < new Date()) return { valid: false, error: "Este link expirou" }

  const timezone = tokenRecord.dispatch.surveyConfiguration.organization.timezone ?? "America/Sao_Paulo"
  const now = toZonedTime(new Date(), timezone)
  const currentTime = format(now, "HH:mm")
  if (currentTime < tokenRecord.workStartTime || currentTime > tokenRecord.workEndTime) {
    return { valid: false, error: "Pesquisa disponível apenas no horário de trabalho" }
  }

  if (tokenRecord.dispatch.status !== "dispatched") {
    return { valid: false, error: "Esta pesquisa não está ativa" }
  }

  return {
    valid: true,
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
