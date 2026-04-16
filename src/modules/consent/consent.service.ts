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
} from "@/modules/consent/consent.repository"
import { findTokenByValue, markTokenUsed } from "@/modules/surveys/survey.repository"

export function getConsentByToken(token: string): Promise<EmployeeConsent | null> {
  return findConsentByToken(token)
}

export function getActiveTermVersion(): Promise<ConsentTermVersion | null> {
  return getActiveConsentTermVersion()
}

export async function sendConsentInvite(tenantId: string, employeeId: string): Promise<void> {
  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", "Versão de termos ativa não encontrada.")

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
    body: `Pulse: Please review and accept our data consent terms. Click here: ${consentUrl}`,
  })
}

export async function recordAcceptance(token: string, cpfHash?: string): Promise<void> {
  const consentInvite = await findConsentByToken(token)
  if (!consentInvite) throw new AppError("TOKEN_INVALID", "Token inválido.")
  if (consentInvite.tokenExpiresAt && consentInvite.tokenExpiresAt < new Date()) {
    throw new AppError("TOKEN_EXPIRED", "Token expirado.")
  }
  const existing = await findExistingConsentEvent(consentInvite.employeeId, consentInvite.consentTermVersionId, ["accepted", "refused"])
  if (existing) throw new AppError("TOKEN_USED", "Este link já foi utilizado.")

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
  if (existing) throw new AppError("TOKEN_USED", "Este link já foi utilizado.")

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
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", "Versão de termos ativa não encontrada.")

  await createConsentRecord({
    tenantId,
    employeeId,
    consentTermVersionId: activeVersion.id,
    event: "opted_out",
    source: "survey_form",
  })
}

export async function optOutFromSurvey(token: string): Promise<void> {
  const tokenRecord = await findTokenByValue(token)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Token inválido.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", "Este link já foi utilizado.")

  await optOut(tokenRecord.tenantId, tokenRecord.employeeId)
  await markTokenUsed(tokenRecord.id)
}
