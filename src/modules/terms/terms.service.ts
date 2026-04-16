import { AppError } from "@/libs/errors/app-error"
import {
  findActiveTermsVersion,
  findAllTermsVersions,
  findTermsVersionById,
  createTermsVersion,
  findUserAcceptance,
  createTermsAcceptance,
  findAcceptancesByVersion,
} from "@/modules/terms/terms.repository"
import type { CreateTermsVersionInput, AcceptTermsInput } from "@/modules/terms/terms.types"

export function getActiveTermsVersion(): ReturnType<typeof findActiveTermsVersion> {
  return findActiveTermsVersion()
}

export function getAllTermsVersions(): ReturnType<typeof findAllTermsVersions> {
  return findAllTermsVersions()
}

export function getTermsVersionById(id: string): ReturnType<typeof findTermsVersionById> {
  return findTermsVersionById(id)
}

export function createNewTermsVersion(input: CreateTermsVersionInput): ReturnType<typeof createTermsVersion> {
  return createTermsVersion(input)
}

export async function getPendingTermsForUser(userId: string): Promise<import("@prisma/client").PlatformTermsVersion | null> {
  const active = await findActiveTermsVersion()
  if (!active) return null

  const acceptance = await findUserAcceptance(userId, active.id)
  if (acceptance) return null

  return active
}

export async function acceptTerms(input: AcceptTermsInput): Promise<import("@prisma/client").PlatformTermsAcceptance> {
  const version = await findTermsVersionById(input.termsVersionId)
  if (!version) throw new AppError("TERMS_NOT_FOUND", "Versão dos termos não encontrada.")
  if (!version.isActive) throw new AppError("TERMS_INACTIVE", "Esta versão dos termos não está mais ativa.")

  const existing = await findUserAcceptance(input.userId, input.termsVersionId)
  if (existing) return existing

  return createTermsAcceptance(input)
}

export function getAcceptancesByVersion(termsVersionId: string): ReturnType<typeof findAcceptancesByVersion> {
  return findAcceptancesByVersion(termsVersionId)
}
