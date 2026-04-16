import { prisma } from "@/libs/db"
import type { PlatformTermsVersion, PlatformTermsAcceptance } from "@prisma/client"
import type { CreateTermsVersionInput, AcceptTermsInput } from "@/modules/terms/terms.types"

export function findActiveTermsVersion(): Promise<PlatformTermsVersion | null> {
  return prisma.platformTermsVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  })
}

export function findAllTermsVersions(): Promise<PlatformTermsVersion[]> {
  return prisma.platformTermsVersion.findMany({ orderBy: { createdAt: "desc" } })
}

export function findTermsVersionById(id: string): Promise<PlatformTermsVersion | null> {
  return prisma.platformTermsVersion.findUnique({ where: { id } })
}

export function createTermsVersion(data: CreateTermsVersionInput): Promise<PlatformTermsVersion> {
  return prisma.$transaction(async (tx) => {
    await tx.platformTermsVersion.updateMany({ where: { isActive: true }, data: { isActive: false } })
    return tx.platformTermsVersion.create({
      data: {
        version: data.version,
        title: data.title,
        content: data.content,
        effectiveAt: data.effectiveAt,
        isActive: true,
      },
    })
  })
}

export function findUserAcceptance(
  userId: string,
  termsVersionId: string,
): Promise<PlatformTermsAcceptance | null> {
  return prisma.platformTermsAcceptance.findUnique({
    where: { userId_termsVersionId: { userId, termsVersionId } },
  })
}

export function createTermsAcceptance(data: AcceptTermsInput): Promise<PlatformTermsAcceptance> {
  return prisma.platformTermsAcceptance.create({
    data: {
      userId: data.userId,
      termsVersionId: data.termsVersionId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}

export function findAcceptancesByVersion(termsVersionId: string): Promise<(import("@prisma/client").PlatformTermsAcceptance & { user: { id: string; name: string; email: string } })[]> {
  return prisma.platformTermsAcceptance.findMany({
    where: { termsVersionId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { acceptedAt: "desc" },
  })
}
