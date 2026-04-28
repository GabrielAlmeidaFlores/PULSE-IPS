import { prisma } from "@/libs/db"
import type { Organization } from "@prisma/client"

export function findAllTenantsScheduledForDeletion(): Promise<Organization[]> {
  return prisma.organization.findMany({
    where: { deletionScheduledAt: { lte: new Date() } },
  })
}

export async function scheduleOrganizationDeletion(tenantId: string, deletionScheduledAt: Date): Promise<void> {
  await prisma.organization.update({
    where: { id: tenantId },
    data: { billingStatus: "cancelled", deletionScheduledAt },
  })
}

export async function cancelOrganizationDeletionSchedule(tenantId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: tenantId },
    data: { deletionScheduledAt: null },
  })
}

export function executeOrganizationDeletion(tenantId: string): Promise<Organization> {
  return prisma.organization.delete({ where: { id: tenantId } })
}

export async function createAccountDeletionToken(userId: string, code: string, expiresAt: Date): Promise<void> {
  await prisma.authToken.deleteMany({ where: { userId, type: "account_deletion" } })
  await prisma.authToken.create({
    data: { userId, type: "account_deletion", token: code, expiresAt },
  })
}

export function findAccountDeletionToken(userId: string): ReturnType<typeof prisma.authToken.findFirst> {
  return prisma.authToken.findFirst({
    where: { userId, type: "account_deletion", usedAt: null },
  })
}

export async function consumeAccountDeletionToken(tokenId: string): Promise<void> {
  await prisma.authToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } })
}
