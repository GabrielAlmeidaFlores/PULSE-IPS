import type { ConsentTermVersion } from "@/modules/consent/consent.types"
import { AppError } from "@/libs/errors/app-error"
import {
  createConsentRecord,
  getActiveConsentTermVersion,
  getAllConsentTermVersions,
  createConsentTermVersion,
  findLatestConsentEventsByEmployeeIds,
  findEmployeeIdsForConsentState,
  atomicAcceptConsentFromToken,
  atomicAcceptConsentFromClimateSurveyToken,
} from "@/modules/consent/consent.repository"
import { findHealthSurveyTokenByValue, markHealthSurveyTokenUsed } from "@/modules/health-surveys/health-survey.repository"
import { findClimateSurveyTokenByValue, markClimateSurveyTokenUsed } from "@/modules/climate-surveys/climate-survey.repository"

const LINK_ALREADY_USED_MSG = "Este link já foi utilizado."
const NO_ACTIVE_TERMS_MSG = "Nenhuma versão ativa dos termos de consentimento encontrada."
const INVALID_OR_EXPIRED_LINK_MSG = "Link inválido ou expirado."

export function getActiveTermVersion(): Promise<ConsentTermVersion | null> {
  return getActiveConsentTermVersion()
}

export async function optOut(
  tenantId: string,
  employeeId: string,
  source: "health_survey_form" | "climate_survey_form" = "health_survey_form",
): Promise<void> {
  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await createConsentRecord({
    tenantId,
    employeeId,
    consentTermVersionId: activeVersion.id,
    event: "opted_out",
    source,
  })
}

export async function acceptConsentFromHealthSurveyToken(healthSurveyToken: string): Promise<void> {
  const tokenRecord = await findHealthSurveyTokenByValue(healthSurveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", INVALID_OR_EXPIRED_LINK_MSG)
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await atomicAcceptConsentFromToken(
    tokenRecord.id,
    tokenRecord.tenantId,
    tokenRecord.employeeId,
    activeVersion.id,
  )
}

export async function refuseConsentFromHealthSurveyToken(healthSurveyToken: string): Promise<void> {
  const tokenRecord = await findHealthSurveyTokenByValue(healthSurveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", INVALID_OR_EXPIRED_LINK_MSG)
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

  await markHealthSurveyTokenUsed(tokenRecord.tenantId, tokenRecord.id)
}

export async function optOutFromHealthSurveyToken(token: string): Promise<void> {
  const tokenRecord = await findHealthSurveyTokenByValue(token)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Token inválido.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  await optOut(tokenRecord.tenantId, tokenRecord.employeeId, "health_survey_form")
  await markHealthSurveyTokenUsed(tokenRecord.tenantId, tokenRecord.id)
}

export async function acceptConsentFromClimateSurveyToken(climateSurveyToken: string): Promise<void> {
  const tokenRecord = await findClimateSurveyTokenByValue(climateSurveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", INVALID_OR_EXPIRED_LINK_MSG)
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await atomicAcceptConsentFromClimateSurveyToken(
    tokenRecord.id,
    tokenRecord.tenantId,
    tokenRecord.employeeId,
    activeVersion.id,
  )
}

export async function refuseConsentFromClimateSurveyToken(climateSurveyToken: string): Promise<void> {
  const tokenRecord = await findClimateSurveyTokenByValue(climateSurveyToken)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", INVALID_OR_EXPIRED_LINK_MSG)
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  const activeVersion = await getActiveConsentTermVersion()
  if (!activeVersion) throw new AppError("NO_ACTIVE_TERMS", NO_ACTIVE_TERMS_MSG)

  await createConsentRecord({
    tenantId: tokenRecord.tenantId,
    employeeId: tokenRecord.employeeId,
    consentTermVersionId: activeVersion.id,
    event: "refused",
    source: "climate_survey_form",
  })

  await markClimateSurveyTokenUsed(tokenRecord.tenantId, tokenRecord.id)
}

export async function optOutFromClimateSurveyToken(token: string): Promise<void> {
  const tokenRecord = await findClimateSurveyTokenByValue(token)
  if (!tokenRecord) throw new AppError("INVALID_TOKEN", "Token inválido.")
  if (tokenRecord.usedAt) throw new AppError("TOKEN_USED", LINK_ALREADY_USED_MSG)

  await optOut(tokenRecord.tenantId, tokenRecord.employeeId, "climate_survey_form")
  await markClimateSurveyTokenUsed(tokenRecord.tenantId, tokenRecord.id)
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
