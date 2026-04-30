import { randomUUID } from "crypto"
import { addHours, format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AppError } from "@/libs/errors/app-error"
import {
  findHealthSurveyTokenByValue,
  deleteAllTenantsExpiredHealthSurveyTokens,
  createHealthSurveyResponseWithItems,
  findHealthSurveyDispatchBySignedLinkToken,
  findEmployeeByPhoneOrDocument,
  findUnusedHealthSurveyTokenForEmployee,
  findUsedHealthSurveyTokenForEmployee,
  createHealthSurveyTokens,
} from "@/modules/health-surveys/health-survey.repository"
import {
  findEmployeeIdsWithAcceptedConsent,
  getCurrentConsent,
  getActiveConsentTermVersion,
} from "@/modules/consent/consent.repository"
import type { SubmitHealthSurveyInput, HealthSurveyTokenValidation, ScoreDirection } from "@/modules/health-surveys/health-survey.types"

export interface SignedLinkUnlockResult {
  token: string
  alreadyAnswered: boolean
}

function isInsideWorkWindow(currentTime: string, workStartTime: string, workEndTime: string): boolean {
  const isNightShift = workEndTime < workStartTime
  return isNightShift
    ? currentTime >= workStartTime || currentTime <= workEndTime
    : currentTime >= workStartTime && currentTime <= workEndTime
}

function resolveTimezone(tokenRecord: { dispatch: { healthSurveyConfiguration: { organization: { timezone: string | null } } } }): string {
  return tokenRecord.dispatch.healthSurveyConfiguration.organization.timezone ?? "America/Sao_Paulo"
}

export async function validateHealthSurveyToken(token: string): Promise<HealthSurveyTokenValidation> {
  const tokenRecord = await findHealthSurveyTokenByValue(token)
  if (!tokenRecord) return { valid: false, error: "Link inválido ou expirado." }
  if (tokenRecord.usedAt) return { valid: false, error: "Esta pesquisa já foi respondida." }
  if (tokenRecord.expiresAt < new Date()) return { valid: false, error: "Este link expirou." }

  const timezone = resolveTimezone(tokenRecord)
  const now = toZonedTime(new Date(), timezone)
  const currentTime = format(now, "HH:mm")
  if (!isInsideWorkWindow(currentTime, tokenRecord.workStartTime, tokenRecord.workEndTime)) {
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
      workStartTime: tokenRecord.workStartTime,
      workEndTime: tokenRecord.workEndTime,
      tenantId: tokenRecord.tenantId,
    },
    questions: tokenRecord.dispatch.healthSurveyConfiguration.questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      scoreDirection: q.scoreDirection as ScoreDirection,
    })),
    timezone,
  }
}

export async function submitHealthSurveyResponse(input: SubmitHealthSurveyInput): Promise<void> {
  const tokenRecord = await findHealthSurveyTokenByValue(input.token)
  if (!tokenRecord) throw new AppError("TOKEN_INVALID", "Token inválido.")
  if (tokenRecord.usedAt) throw new AppError("SURVEY_ALREADY_ANSWERED", "Esta pesquisa já foi respondida.")
  if (tokenRecord.expiresAt < new Date()) throw new AppError("TOKEN_EXPIRED", "Este link expirou.")

  const timezone = resolveTimezone(tokenRecord)
  const nowInTimezone = toZonedTime(new Date(), timezone)
  const currentTime = format(nowInTimezone, "HH:mm")

  if (!isInsideWorkWindow(currentTime, tokenRecord.workStartTime, tokenRecord.workEndTime)) {
    throw new AppError(
      "OUTSIDE_WORK_WINDOW",
      `Pesquisa disponível apenas entre ${tokenRecord.workStartTime} e ${tokenRecord.workEndTime}.`,
    )
  }

  await createHealthSurveyResponseWithItems({
    tenantId: tokenRecord.tenantId,
    dispatchId: tokenRecord.dispatchId,
    tokenId: tokenRecord.id,
    answers: input.answers,
  })
}

export function cleanupExpiredHealthSurveyTokens(): Promise<{ count: number }> {
  return deleteAllTenantsExpiredHealthSurveyTokens()
}

export async function unlockHealthSurveyViaIdentifier(
  signedLinkToken: string,
  identifier: string,
): Promise<SignedLinkUnlockResult> {
  const dispatch = await findHealthSurveyDispatchBySignedLinkToken(signedLinkToken)
  if (!dispatch) throw new AppError("DISPATCH_NOT_FOUND", "Link de pesquisa inválido ou expirado.")

  const tenantId = dispatch.tenantId
  const timezone = dispatch.healthSurveyConfiguration.organization.timezone ?? "America/Sao_Paulo"

  const employee = await findEmployeeByPhoneOrDocument(tenantId, identifier.trim())
  if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "Colaborador não encontrado. Verifique o número de telefone ou documento.")

  const acceptedIds = await findEmployeeIdsWithAcceptedConsent(tenantId, [employee.id])
  if (!acceptedIds.includes(employee.id)) {
    throw new AppError("CONSENT_REQUIRED", "Você precisa aceitar os termos de consentimento antes de responder.")
  }

  const usedToken = await findUsedHealthSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
  if (usedToken) return { token: usedToken.token, alreadyAnswered: true }

  const existingToken = await findUnusedHealthSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
  if (existingToken) return { token: existingToken.token, alreadyAnswered: false }

  const config = dispatch.healthSurveyConfiguration
  const workStartTime = employee.workStartTime ?? config.workStartTime
  const workEndTime = employee.workEndTime ?? config.workEndTime

  const nowInTimezone = toZonedTime(new Date(), timezone)
  const currentTime = format(nowInTimezone, "HH:mm")
  if (!isInsideWorkWindow(currentTime, workStartTime, workEndTime)) {
    throw new AppError(
      "OUTSIDE_WORK_WINDOW",
      `Pesquisa disponível apenas entre ${workStartTime} e ${workEndTime}.`,
    )
  }

  const newToken = randomUUID()
  await createHealthSurveyTokens([{
    tenantId,
    dispatchId: dispatch.id,
    employeeId: employee.id,
    token: newToken,
    expiresAt: addHours(new Date(), 48),
    workStartTime,
    workEndTime,
  }])

  return { token: newToken, alreadyAnswered: false }
}
