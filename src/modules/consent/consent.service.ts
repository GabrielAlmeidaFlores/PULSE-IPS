import { randomUUID } from "crypto"
import { addDays } from "date-fns"
import type { EmployeeConsent, ConsentTermVersion } from "@prisma/client"
import { env } from "@/env"
import { getMessageQueue } from "@/libs/queue"
import { AppError } from "@/libs/errors/app-error"
import {
  createConsentRecord,
  findConsentByToken,
  findExistingConsentEvent,
  getActiveConsentTermVersion,
  findEmployeeForConsent,
  getAllConsentTermVersions,
  createConsentTermVersion,
  findLatestConsentEventsByEmployeeIds,
  findEmployeeIdsForConsentState,
} from "@/modules/consent/consent.repository"
import { findTokenByValue, markTokenUsed } from "@/modules/health-surveys/health-survey.repository"

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

  const messageQueue = getMessageQueue()
  const consentBody = env.CONSENT_MESSAGE_TEMPLATE
    .replace("{nome}", employee.name)
    .replace("{link}", consentUrl)
  await messageQueue.add("send-message", {
    to: employee.phone,
    body: consentBody,
    tenantId,
    employeeId,
    provider: env.MESSAGING_PROVIDER,
    type: "consent_invite",
    templateName: env.WHATSAPP_CONSENT_TEMPLATE_NAME,
    templateVariables: [employee.name, consentUrl],
  })
}

export async function recordAcceptance(token: string, cpfHash?: string): Promise<void> {
  const consentInvite = await findConsentByToken(token)
  if (!consentInvite) throw new AppError("TOKEN_INVALID", "Token inválido.")
  if (consentInvite.tokenExpiresAt && consentInvite.tokenExpiresAt < new Date()) {
    throw new AppError("TOKEN_EXPIRED", "Token expirado.")
  }
  const existing = await findExistingConsentEvent(consentInvite.tenantId, consentInvite.employeeId, consentInvite.consentTermVersionId, ["accepted", "refused"])
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
  const existing = await findExistingConsentEvent(consentInvite.tenantId, consentInvite.employeeId, consentInvite.consentTermVersionId, ["accepted", "refused"])
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
    source: "health_survey_form",
  })
}

export async function acceptConsentFromHealthSurveyToken(healthSurveyToken: string): Promise<void> {
  const tokenRecord = await findTokenByValue(healthSurveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Link inválido ou expirado.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  const existing = await findExistingConsentEvent(tokenRecord.tenantId, tokenRecord.employeeId, activeVersion.id, ["accepted"])
  if (!existing) {
    await createConsentRecord({
      tenantId: tokenRecord.tenantId,
      employeeId: tokenRecord.employeeId,
      consentTermVersionId: activeVersion.id,
      event: "accepted",
      source: "health_survey_form",
    })
  }

  await markTokenUsed(tokenRecord.id)
}

export async function refuseConsentFromHealthSurveyToken(healthSurveyToken: string): Promise<void> {
  const tokenRecord = await findTokenByValue(healthSurveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Link inválido ou expirado.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await createConsentRecord({
    tenantId: tokenRecord.tenantId,
    employeeId: tokenRecord.employeeId,
    consentTermVersionId: activeVersion.id,
    event: "refused",
    source: "health_survey_form",
  })

  await markTokenUsed(tokenRecord.id)
}

export async function optOutFromHealthSurveyToken(token: string): Promise<void> {
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

export function getConsentEventsByEmployeeIds(
  tenantId: string,
  employeeIds: string[],
): Promise<Map<string, string>> {
  return findLatestConsentEventsByEmployeeIds(tenantId, employeeIds)
}

export function getEmployeeIdsForConsentState(tenantId: string, consentFilter: string): Promise<string[]> {
  return findEmployeeIdsForConsentState(tenantId, consentFilter)
}
