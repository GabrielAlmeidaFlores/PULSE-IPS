import { createHash } from "crypto"
import { prisma } from "@/libs/db"
import type { EmployeeConsent, ConsentTermVersion } from "@prisma/client"
import type { CreateConsentRecordInput, CreateConsentTermVersionInput } from "@/modules/consent/consent.types"

export type ConsentWithTermVersion = EmployeeConsent & { consentTermVersion: ConsentTermVersion }

export function getCurrentConsent(tenantId: string, employeeId: string): Promise<ConsentWithTermVersion | null> {
  return prisma.employeeConsent.findFirst({
    where: { tenantId, employeeId },
    include: { consentTermVersion: true },
    orderBy: { createdAt: "desc" },
  })
}

export function getConsentHistory(tenantId: string, employeeId: string): Promise<ConsentWithTermVersion[]> {
  return prisma.employeeConsent.findMany({
    where: { tenantId, employeeId },
    include: { consentTermVersion: true },
    orderBy: { createdAt: "desc" },
  })
}

export function createConsentRecord(data: CreateConsentRecordInput): Promise<EmployeeConsent> {
  return prisma.employeeConsent.create({
    data: {
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      consentTermVersionId: data.consentTermVersionId,
      event: data.event,
      source: data.source,
      ...(data.cpfHash !== undefined && { cpfHash: data.cpfHash }),
      ...(data.token !== undefined && { token: data.token }),
      ...(data.tokenExpiresAt !== undefined && { tokenExpiresAt: data.tokenExpiresAt }),
    },
  })
}

export function findConsentByToken(token: string): Promise<EmployeeConsent | null> {
  return prisma.employeeConsent.findUnique({ where: { token } })
}

export function findExistingConsentEvent(
  employeeId: string,
  consentTermVersionId: string,
  events: string[],
): Promise<EmployeeConsent | null> {
  return prisma.employeeConsent.findFirst({
    where: { employeeId, consentTermVersionId, event: { in: events } },
  })
}

export function getActiveConsentTermVersion(): Promise<ConsentTermVersion | null> {
  return prisma.consentTermVersion.findFirst({ where: { isActive: true } })
}

export function findEmployeeForConsent(tenantId: string, employeeId: string): Promise<import("@prisma/client").Employee | null> {
  return prisma.employee.findFirst({ where: { id: employeeId, tenantId } })
}

export function getAllConsentTermVersions(): Promise<ConsentTermVersion[]> {
  return prisma.consentTermVersion.findMany({ orderBy: { createdAt: "desc" } })
}

export function createConsentTermVersion(data: CreateConsentTermVersionInput): Promise<ConsentTermVersion> {
  const contentHash = createHash("sha256").update(data.content).digest("hex")
  return prisma.$transaction(async (tx) => {
    await tx.consentTermVersion.updateMany({ where: { isActive: true }, data: { isActive: false } })
    return tx.consentTermVersion.create({
      data: {
        version: data.version,
        content: data.content,
        contentHash,
        isActive: true,
      },
    })
  })
}

export async function findEmployeeIdsWithAcceptedConsent(tenantId: string, employeeIds: string[]): Promise<string[]> {
  if (employeeIds.length === 0) return []
  const latestConsents = await prisma.employeeConsent.findMany({
    where: { tenantId, employeeId: { in: employeeIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["employeeId"],
    select: { employeeId: true, event: true },
  })
  return latestConsents
    .filter((c) => c.event === "accepted")
    .map((c) => c.employeeId)
}
