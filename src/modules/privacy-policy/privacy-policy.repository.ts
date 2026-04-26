import { prisma } from "@/libs/db"
import type { PrivacyPolicyVersion } from "@prisma/client"
import type { CreatePrivacyPolicyVersionInput } from "@/modules/privacy-policy/privacy-policy.types"

export function findActivePrivacyPolicyVersion(): Promise<PrivacyPolicyVersion | null> {
  return prisma.privacyPolicyVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  })
}

export function findAllPrivacyPolicyVersions(): Promise<PrivacyPolicyVersion[]> {
  return prisma.privacyPolicyVersion.findMany({ orderBy: { createdAt: "desc" } })
}

export function findPrivacyPolicyVersionById(id: string): Promise<PrivacyPolicyVersion | null> {
  return prisma.privacyPolicyVersion.findUnique({ where: { id } })
}

export function createPrivacyPolicyVersion(
  data: CreatePrivacyPolicyVersionInput,
): Promise<PrivacyPolicyVersion> {
  return prisma.$transaction(async (tx) => {
    await tx.privacyPolicyVersion.updateMany({ where: { isActive: true }, data: { isActive: false } })
    return tx.privacyPolicyVersion.create({
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
