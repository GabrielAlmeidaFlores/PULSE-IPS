import { randomUUID } from "crypto"
import { addHours, format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AppError } from "@/libs/errors/app-error"
import {
  findHealthSurveyTokenByValue,
  findHealthSurveyTokenByShortCode,
  deleteAllTenantsExpiredHealthSurveyTokens,
  createHealthSurveyResponseWithItems,
  findHealthSurveyDispatchBySignedLinkToken,
  findEmployeeByPhoneOrDocument,
  findUnusedHealthSurveyTokenForEmployee,
  findUsedHealthSurveyTokenForEmployee,
  createHealthSurveyTokens,
  refreshHealthSurveyTokenWorkHours,
} from "@/modules/health-surveys/health-survey.repository"
import {
  getCurrentConsent,
  getActiveConsentTermVersion,
} from "@/modules/consent/consent.repository"
import type { SubmitHealthSurveyInput, HealthSurveyTokenValidation, ScoreDirection } from "@/modules/health-surveys/health-survey.types"

export interface SignedLinkUnlockResult {
  token: string
  alreadyAnswered: boolean
  needsConsent?: true
  employeeName?: string
  consentTermContent?: string | null
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
  if (tokenRecord.employee.deletedAt) return { valid: false, error: "Colaborador não encontrado." }

  const timezone = resolveTimezone(tokenRecord)
  const now = toZonedTime(new Date(), timezone)
  const currentTime = format(now, "HH:mm")
  if (!isInsideWorkWindow(currentTime, tokenRecord.workStartTime, tokenRecord.workEndTime)) {
    return { valid: false, error: "Pesquisa disponível apenas no horário de trabalho." }
  }

  const [currentConsent, activeTermVersion] = await Promise.all([
    getCurrentConsent(tokenRecord.tenantId, tokenRecord.employeeId),
    getActiveConsentTermVersion(),
  ])

  const hasAcceptedCurrentVersion =
    currentConsent?.event === "accepted" &&
    currentConsent?.consentTermVersionId === activeTermVersion?.id

  const questions = tokenRecord.dispatch.healthSurveyConfiguration.questions
  if (questions.length === 0) return { valid: false, error: "Esta pesquisa não possui perguntas ativas." }

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
    questions: questions.map((q) => ({
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
  if (tokenRecord.employee.deletedAt) throw new AppError("EMPLOYEE_DELETED", "Colaborador não encontrado.")

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
    departmentId: tokenRecord.employee.departmentId,
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
  if (dispatch.status !== "available") throw new AppError("DISPATCH_NOT_AVAILABLE", "Esta pesquisa não está disponível no momento.")

  const tenantId = dispatch.tenantId

  const employee = await findEmployeeByPhoneOrDocument(tenantId, identifier.trim())
  if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "Colaborador não encontrado. Verifique o número de telefone ou documento.")

  const configDeptIds = new Set(dispatch.healthSurveyConfiguration.configDepartments.map((cd) => cd.department.id))
  if (!configDeptIds.has(employee.departmentId)) {
    throw new AppError("EMPLOYEE_NOT_IN_DEPARTMENT", "Esta pesquisa não está disponível para o seu setor.")
  }

  const matchedDept = dispatch.healthSurveyConfiguration.configDepartments.find(
    (cd) => cd.department.id === employee.departmentId,
  )

  const deptWorkStartTime = matchedDept?.department.workStartTime ?? "09:00"
  const deptWorkEndTime = matchedDept?.department.workEndTime ?? "18:00"

  return resolveDispatchUnlock(dispatch, employee, deptWorkStartTime, deptWorkEndTime)
}

async function resolveDispatchUnlock(
  dispatch: NonNullable<Awaited<ReturnType<typeof findHealthSurveyDispatchBySignedLinkToken>>>,
  employee: { id: string; name: string; workStartTime: string | null; workEndTime: string | null; departmentId: string },
  deptWorkStartTime: string,
  deptWorkEndTime: string,
): Promise<SignedLinkUnlockResult> {
  const tenantId = dispatch.tenantId
  const timezone = dispatch.healthSurveyConfiguration.organization.timezone ?? "America/Sao_Paulo"

  const currentConsent = await getCurrentConsent(tenantId, employee.id)
  const activeTermVersion = await getActiveConsentTermVersion()
  const hasAcceptedCurrentVersion =
    currentConsent?.event === "accepted" &&
    currentConsent?.consentTermVersionId === activeTermVersion?.id

  const workStartTime = employee.workStartTime ?? deptWorkStartTime
  const workEndTime = employee.workEndTime ?? deptWorkEndTime
  const nowInTimezone = toZonedTime(new Date(), timezone)
  const currentTime = format(nowInTimezone, "HH:mm")

  if (!isInsideWorkWindow(currentTime, workStartTime, workEndTime)) {
    throw new AppError("OUTSIDE_WORK_WINDOW", `Pesquisa disponível apenas entre ${workStartTime} e ${workEndTime}.`)
  }

  if (!hasAcceptedCurrentVersion) {
    const existingUnusedToken = await findUnusedHealthSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
    let consentToken: string
    if (existingUnusedToken) {
      if (existingUnusedToken.workStartTime !== workStartTime || existingUnusedToken.workEndTime !== workEndTime) {
        await refreshHealthSurveyTokenWorkHours(existingUnusedToken.id, workStartTime, workEndTime)
      }
      consentToken = existingUnusedToken.token
    } else {
      consentToken = randomUUID()
      await createHealthSurveyTokens([{
        tenantId,
        dispatchId: dispatch.id,
        employeeId: employee.id,
        token: consentToken,
        expiresAt: addHours(new Date(), 48),
        workStartTime,
        workEndTime,
      }])
    }

    return {
      token: consentToken,
      alreadyAnswered: false,
      needsConsent: true,
      employeeName: employee.name,
      consentTermContent: activeTermVersion?.content ?? null,
    }
  }

  const usedToken = await findUsedHealthSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
  if (usedToken) return { token: usedToken.token, alreadyAnswered: true }

  const existingToken = await findUnusedHealthSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
  if (existingToken) {
    if (existingToken.workStartTime !== workStartTime || existingToken.workEndTime !== workEndTime) {
      await refreshHealthSurveyTokenWorkHours(existingToken.id, workStartTime, workEndTime)
    }
    return { token: existingToken.token, alreadyAnswered: false }
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

export async function resolveHealthSurveyShortCode(
  orgSlug: string,
  shortCode: string,
): Promise<string | null> {
  const record = await findHealthSurveyTokenByShortCode(orgSlug, shortCode)
  return record?.token ?? null
}
