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
      ...(data.documentHash !== undefined && { documentHash: data.documentHash }),
      ...(data.token !== undefined && { token: data.token }),
      ...(data.tokenExpiresAt !== undefined && { tokenExpiresAt: data.tokenExpiresAt }),
    },
  })
}

export function findConsentByToken(token: string): Promise<EmployeeConsent | null> {
  return prisma.employeeConsent.findUnique({ where: { token } })
}

export function findExistingConsentEvent(
  tenantId: string,
  employeeId: string,
  consentTermVersionId: string,
  events: string[],
): Promise<EmployeeConsent | null> {
  return prisma.employeeConsent.findFirst({
    where: { tenantId, employeeId, consentTermVersionId, event: { in: events } },
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

export async function findLatestConsentEventsByEmployeeIds(
  tenantId: string,
  employeeIds: string[],
): Promise<Map<string, string>> {
  if (employeeIds.length === 0) return new Map()
  const records = await prisma.employeeConsent.findMany({
    where: { tenantId, employeeId: { in: employeeIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["employeeId"],
    select: { employeeId: true, event: true },
  })
  return new Map(records.map((r) => [r.employeeId, r.event]))
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

export async function findEmployeeIdsEligibleForDispatch(tenantId: string, employeeIds: string[]): Promise<string[]> {
  if (employeeIds.length === 0) return []
  const latestConsents = await prisma.employeeConsent.findMany({
    where: { tenantId, employeeId: { in: employeeIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["employeeId"],
    select: { employeeId: true, event: true },
  })
  const excludedIds = new Set(
    latestConsents
      .filter((c) => c.event === "refused" || c.event === "opted_out")
      .map((c) => c.employeeId),
  )
  return employeeIds.filter((id) => !excludedIds.has(id))
}

export async function findEmployeeIdsForConsentState(tenantId: string, consentFilter: string): Promise<string[]> {
  if (consentFilter === "not_sent") {
    const [withConsent, allEmployees] = await Promise.all([
      prisma.employeeConsent.findMany({
        where: { tenantId },
        distinct: ["employeeId"],
        select: { employeeId: true },
      }),
      prisma.employee.findMany({
        where: { tenantId },
        select: { id: true },
      }),
    ])
    const withConsentIds = new Set(withConsent.map((c) => c.employeeId))
    return allEmployees.filter((e) => !withConsentIds.has(e.id)).map((e) => e.id)
  }

  const latestEvents = await prisma.employeeConsent.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    distinct: ["employeeId"],
    select: { employeeId: true, event: true },
  })

  if (consentFilter === "opt_out") {
    return latestEvents
      .filter((c) => c.event === "opted_out")
      .map((c) => c.employeeId)
  }

  return latestEvents.filter((c) => c.event === consentFilter).map((c) => c.employeeId)
}
