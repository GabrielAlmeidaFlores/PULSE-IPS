import { randomUUID } from "crypto"
import { addDays } from "date-fns"
import type { EmployeeConsent, ConsentTermVersion } from "@prisma/client"
import { env } from "@/env"
import { getMessagingService } from "@/libs/integrations"
import { AppError } from "@/libs/errors/app-error"
import {
  createConsentRecord,
  findConsentByToken,
  findExistingConsentEvent,
  getActiveConsentTermVersion,
  findEmployeeForConsent,
  getAllConsentTermVersions,
  createConsentTermVersion,
} from "@/modules/consent/consent.repository"
import { findTokenByValue, markTokenUsed } from "@/modules/surveys/survey.repository"

const NO_ACTIVE_TERMS_MSG = "Versão de termos ativa não encontrada."
const LINK_ALREADY_USED_MSG = "Este link já foi utilizado."

export function getConsentByToken(token: string): Promise<EmployeeConsent | null> {
  return findConsentByToken(token)
}

export function getActiveTermVersion(): Promise<ConsentTermVersion | null> {
  return getActiveConsentTermVersion()
}

export async function sendConsentInvite(tenantId: string, employeeId: string): Promise<void> {
  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  const employee = await findEmployeeForConsent(tenantId, employeeId)
  if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "Colaborador não encontrado.")

  const token = randomUUID()
  const tokenExpiresAt = addDays(new Date(), 30)
  const consentUrl = `${env.NEXT_PUBLIC_APP_URL}/consent/${token}`

  await createConsentRecord({
    tenantId,
    employeeId,
    consentTermVersionId: activeVersion.id,
    event: "invited",
    source: "sms_link",
    token,
    tokenExpiresAt,
  })

  const messaging = getMessagingService()
  await messaging.send({
    to: employee.phone,
    body: `Pulse: Acesse o link abaixo para revisar e aceitar os termos de participação nas pesquisas de bem-estar: ${consentUrl}`,
  })
}

export async function recordAcceptance(token: string, cpfHash?: string): Promise<void> {
  const consentInvite = await findConsentByToken(token)
  if (!consentInvite) throw new AppError("TOKEN_INVALID", "Token inválido.")
  if (consentInvite.tokenExpiresAt && consentInvite.tokenExpiresAt < new Date()) {
    throw new AppError("TOKEN_EXPIRED", "Token expirado.")
  }
  const existing = await findExistingConsentEvent(consentInvite.employeeId, consentInvite.consentTermVersionId, ["accepted", "refused"])
  if (existing) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  await createConsentRecord({
    tenantId: consentInvite.tenantId,
    employeeId: consentInvite.employeeId,
    consentTermVersionId: consentInvite.consentTermVersionId,
    event: "accepted",
    source: "sms_link",
    ...(cpfHash !== undefined ? { cpfHash } : {}),
  })
}

export async function recordRefusal(token: string): Promise<void> {
  const consentInvite = await findConsentByToken(token)
  if (!consentInvite) throw new AppError("TOKEN_INVALID", "Token inválido.")
  if (consentInvite.tokenExpiresAt && consentInvite.tokenExpiresAt < new Date()) {
    throw new AppError("TOKEN_EXPIRED", "Token expirado.")
  }
  const existing = await findExistingConsentEvent(consentInvite.employeeId, consentInvite.consentTermVersionId, ["accepted", "refused"])
  if (existing) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  await createConsentRecord({
    tenantId: consentInvite.tenantId,
    employeeId: consentInvite.employeeId,
    consentTermVersionId: consentInvite.consentTermVersionId,
    event: "refused",
    source: "sms_link",
  })
}

export async function optOut(tenantId: string, employeeId: string): Promise<void> {
  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await createConsentRecord({
    tenantId,
    employeeId,
    consentTermVersionId: activeVersion.id,
    event: "opted_out",
    source: "survey_form",
  })
}

export async function acceptConsentFromSurveyToken(surveyToken: string): Promise<void> {
  const tokenRecord = await findTokenByValue(surveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Link inválido ou expirado.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  const existing = await findExistingConsentEvent(tokenRecord.employeeId, activeVersion.id, ["accepted"])
  if (!existing) {
    await createConsentRecord({
      tenantId: tokenRecord.tenantId,
      employeeId: tokenRecord.employeeId,
      consentTermVersionId: activeVersion.id,
      event: "accepted",
      source: "sms_link",
    })
  }
}

export async function refuseConsentFromSurveyToken(surveyToken: string): Promise<void> {
  const tokenRecord = await findTokenByValue(surveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Link inválido ou expirado.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await createConsentRecord({
    tenantId: tokenRecord.tenantId,
    employeeId: tokenRecord.employeeId,
    consentTermVersionId: activeVersion.id,
    event: "refused",
    source: "sms_link",
  })

  await markTokenUsed(tokenRecord.id)
}

export async function optOutFromSurveyToken(token: string): Promise<void> {
  const tokenRecord = await findTokenByValue(token)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Token inválido.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  await optOut(tokenRecord.tenantId, tokenRecord.employeeId)
  await markTokenUsed(tokenRecord.id)
}

export function listAllConsentTermVersions(): Promise<ConsentTermVersion[]> {
  return getAllConsentTermVersions()
}

export function publishNewConsentTermVersion(input: { version: string; content: string }): Promise<ConsentTermVersion> {
  if (!input.version.trim() || !input.content.trim()) {
    throw new AppError("INVALID_INPUT", "Versão e conteúdo são obrigatórios.")
  }
  return createConsentTermVersion({ version: input.version.trim(), content: input.content.trim() })
}
