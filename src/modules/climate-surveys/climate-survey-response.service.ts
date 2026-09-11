import { randomUUID } from "crypto"
import { addHours, format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AppError } from "@/libs/errors/app-error"
import {
  findClimateSurveyTokenByValue,
  findClimateSurveyTokenByShortCode,
  deleteAllTenantsExpiredClimateSurveyTokens,
  createClimateSurveyResponseWithItems,
  findClimateSurveyDispatchBySignedLinkToken,
  findEmployeeByPhoneOrDocument,
  findUnusedClimateSurveyTokenForEmployee,
  findUsedClimateSurveyTokenForEmployee,
  createClimateSurveyTokens,
  refreshClimateSurveyTokenWorkHours,
  findClimateSurveyQuestionDirectionsForDispatch,
} from "@/modules/climate-surveys/climate-survey.repository"
import {
  getCurrentConsent,
  getActiveConsentTermVersion,
} from "@/modules/consent/consent.repository"
import { toClimateSurveyDimension, resolveClimateSurveyTopicLabel, type SubmitClimateSurveyInput, type ClimateSurveyTokenValidation, type ScoreDirection, type ClimateSurveyEnpsCategory } from "@/modules/climate-surveys/climate-survey.types"
import { getClimateSurveyTopicLabelMap } from "@/modules/climate-surveys/climate-survey-topic.service"
import { completeClimateSurveyResponseAnalytics } from "@/modules/climate-surveys/climate-survey-analytics.service"
import {
  classifyClimateSurveyEnpsNote,
  climateSurveyLikertToEnpsNote,
  normalizeClimateSurveyLikertScore,
} from "@/modules/climate-surveys/climate-survey-metrics"

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

function resolveTimezone(tokenRecord: { dispatch: { climateSurveyConfiguration: { organization: { timezone: string | null } } } }): string {
  return tokenRecord.dispatch.climateSurveyConfiguration.organization.timezone ?? "America/Sao_Paulo"
}

export async function validateClimateSurveyToken(token: string): Promise<ClimateSurveyTokenValidation> {
  const tokenRecord = await findClimateSurveyTokenByValue(token)
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

  const questions = tokenRecord.dispatch.climateSurveyConfiguration.questions
  if (questions.length === 0) return { valid: false, error: "Esta pesquisa não possui perguntas ativas." }

  const topicLabelMap = await getClimateSurveyTopicLabelMap(tokenRecord.tenantId)

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
    questions: questions.map((q) => {
      const dimension = toClimateSurveyDimension(q.dimension)
      return {
        id: q.id,
        text: q.text,
        order: q.order,
        scoreDirection: q.scoreDirection as ScoreDirection,
        dimension,
        dimensionLabel: resolveClimateSurveyTopicLabel(dimension, topicLabelMap),
      }
    }),
    timezone,
  }
}

export async function submitClimateSurveyResponse(input: SubmitClimateSurveyInput): Promise<void> {
  const tokenRecord = await findClimateSurveyTokenByValue(input.token)
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

  const trimmedOpenComment = input.openComment !== undefined ? input.openComment.trim() : ""
  if (trimmedOpenComment.length > 1000) {
    throw new AppError("OPEN_COMMENT_TOO_LONG", "O comentário deve ter no máximo 1000 caracteres.")
  }

  const questionDirections = await findClimateSurveyQuestionDirectionsForDispatch(
    tokenRecord.tenantId,
    tokenRecord.dispatchId,
  )
  const directionById = new Map(questionDirections.map((question) => [question.id, question.scoreDirection]))
  const normalizedScores: number[] = []
  for (const answer of input.answers) {
    const direction = directionById.get(answer.questionId)
    if (direction === undefined) continue
    normalizedScores.push(normalizeClimateSurveyLikertScore(answer.score, direction))
  }
  const averageScore =
    normalizedScores.length > 0
      ? normalizedScores.reduce((sum, value) => sum + value, 0) / normalizedScores.length
      : null
  const enpsCategory: ClimateSurveyEnpsCategory | undefined =
    averageScore === null ? undefined : classifyClimateSurveyEnpsNote(climateSurveyLikertToEnpsNote(averageScore))

  await createClimateSurveyResponseWithItems({
    tenantId: tokenRecord.tenantId,
    dispatchId: tokenRecord.dispatchId,
    departmentId: tokenRecord.employee.departmentId,
    tokenId: tokenRecord.id,
    answers: input.answers,
    ...(trimmedOpenComment.length > 0 ? { openComment: trimmedOpenComment } : {}),
    ...(enpsCategory !== undefined ? { enpsCategory } : {}),
  })

  await completeClimateSurveyResponseAnalytics(
    tokenRecord.tenantId,
    tokenRecord.id,
    tokenRecord.dispatchId,
  )
}

export function cleanupExpiredClimateSurveyTokens(): Promise<{ count: number }> {
  return deleteAllTenantsExpiredClimateSurveyTokens()
}

export async function unlockClimateSurveyViaIdentifier(
  signedLinkToken: string,
  identifier: string,
): Promise<SignedLinkUnlockResult> {
  const dispatch = await findClimateSurveyDispatchBySignedLinkToken(signedLinkToken)
  if (!dispatch) throw new AppError("DISPATCH_NOT_FOUND", "Link de pesquisa inválido ou expirado.")
  if (dispatch.status !== "available") throw new AppError("DISPATCH_NOT_AVAILABLE", "Esta pesquisa não está disponível no momento.")

  const tenantId = dispatch.tenantId

  const employee = await findEmployeeByPhoneOrDocument(tenantId, identifier.trim())
  if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "Colaborador não encontrado. Verifique o número de telefone ou documento.")

  const configDeptIds = new Set(dispatch.climateSurveyConfiguration.configDepartments.map((cd) => cd.department.id))
  if (!configDeptIds.has(employee.departmentId)) {
    throw new AppError("EMPLOYEE_NOT_IN_DEPARTMENT", "Esta pesquisa não está disponível para o seu setor.")
  }

  const matchedDept = dispatch.climateSurveyConfiguration.configDepartments.find(
    (cd) => cd.department.id === employee.departmentId,
  )

  const deptWorkStartTime = matchedDept?.department.workStartTime ?? "09:00"
  const deptWorkEndTime = matchedDept?.department.workEndTime ?? "18:00"

  return resolveDispatchUnlock(dispatch, employee, deptWorkStartTime, deptWorkEndTime)
}

async function resolveDispatchUnlock(
  dispatch: NonNullable<Awaited<ReturnType<typeof findClimateSurveyDispatchBySignedLinkToken>>>,
  employee: { id: string; name: string; workStartTime: string | null; workEndTime: string | null; departmentId: string },
  deptWorkStartTime: string,
  deptWorkEndTime: string,
): Promise<SignedLinkUnlockResult> {
  const tenantId = dispatch.tenantId
  const timezone = dispatch.climateSurveyConfiguration.organization.timezone ?? "America/Sao_Paulo"

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
    const existingUnusedToken = await findUnusedClimateSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
    let consentToken: string
    if (existingUnusedToken) {
      if (existingUnusedToken.workStartTime !== workStartTime || existingUnusedToken.workEndTime !== workEndTime) {
        await refreshClimateSurveyTokenWorkHours(existingUnusedToken.id, workStartTime, workEndTime)
      }
      consentToken = existingUnusedToken.token
    } else {
      consentToken = randomUUID()
      await createClimateSurveyTokens([{
        id: randomUUID(),
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

  const usedToken = await findUsedClimateSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
  if (usedToken) return { token: usedToken.token, alreadyAnswered: true }

  const existingToken = await findUnusedClimateSurveyTokenForEmployee(tenantId, dispatch.id, employee.id)
  if (existingToken) {
    if (existingToken.workStartTime !== workStartTime || existingToken.workEndTime !== workEndTime) {
      await refreshClimateSurveyTokenWorkHours(existingToken.id, workStartTime, workEndTime)
    }
    return { token: existingToken.token, alreadyAnswered: false }
  }

  const newToken = randomUUID()
  await createClimateSurveyTokens([{
    id: randomUUID(),
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

export async function resolveClimateSurveyShortCode(
  orgSlug: string,
  shortCode: string,
): Promise<string | null> {
  const record = await findClimateSurveyTokenByShortCode(orgSlug, shortCode)
  return record?.token ?? null
}
