import type { Prisma, Organization, Plan, OrganizationSubscription } from "@prisma/client"
import { prisma } from "@/libs/db"
import type { CreateOrganizationInput, UpdateOrganizationInput, OrgFullDetail, OrgAuditEntry } from "@/modules/organizations/organization.types"

export function findOrganizationById(tenantId: string): Promise<Organization | null> {
  return prisma.organization.findFirst({ where: { id: tenantId } })
}

export function findOrganizationBySlug(slug: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { slug } })
}

export function findAllOrganizations(): Promise<(Organization & { plan: Plan | null; _count: { employees: number } })[]> {
  return prisma.organization.findMany({
    include: { plan: true, _count: { select: { employees: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export function createOrganization(data: CreateOrganizationInput): Promise<Organization> {
  return prisma.organization.create({ data })
}

export function updateOrganization(tenantId: string, data: UpdateOrganizationInput): Promise<Organization> {
  return prisma.organization.update({ where: { id: tenantId }, data })
}

export function deleteOrganization(tenantId: string): Promise<Organization> {
  return prisma.organization.delete({ where: { id: tenantId } })
}

export async function updateOrganizationCustomerId(id: string, externalCustomerId: string): Promise<void> {
  await prisma.organization.update({
    where: { id },
    data: { externalCustomerId },
  })
}

export function findOrganizationForAdmin(id: string): Promise<(Organization & { plan: Plan | null; subscription: OrganizationSubscription | null; _count: { employees: number; departments: number } }) | null> {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      plan: true,
      subscription: true,
      _count: { select: { employees: true, departments: true } },
    },
  })
}

export function findOrganizationBilling(id: string): Promise<(Organization & { subscription: OrganizationSubscription | null; plan: Plan | null }) | null> {
  return prisma.organization.findUnique({
    where: { id },
    include: { subscription: true, plan: true },
  })
}

export function findAllOrganizationsForExport(): Promise<(Organization & { plan: { name: string } | null; subscription: { status: string; snapshotPriceInCents: number; snapshotInterval: string; createdAt: Date } | null; _count: { employees: number } })[]> {
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      plan: { select: { name: true } },
      subscription: {
        select: {
          status: true,
          snapshotPriceInCents: true,
          snapshotInterval: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          employees: { where: { status: "active", deletedAt: null } },
        },
      },
    },
  })
}

export function findAllTenantsActiveOrganizationIds(): Promise<{ id: string }[]> {
  return prisma.organization.findMany({
    where: { isActive: true, billingStatus: { in: ["active", "trialing"] } },
    select: { id: true },
  })
}

export function findOrganizationsByIds(ids: string[]): Promise<{ id: string; name: string; slug: string }[]> {
  return prisma.organization.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  })
}

export function findOrganizationByCustomerId(externalCustomerId: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { externalCustomerId } })
}

export async function updateOrganizationBillingStatus(id: string, billingStatus: string, planId?: string): Promise<void> {
  await prisma.organization.update({
    where: { id },
    data: { billingStatus, ...(planId !== undefined && { planId }) },
  })
}

export function findOrganizationRequired(id: string): Promise<Organization> {
  return prisma.organization.findUniqueOrThrow({ where: { id } })
}

export async function findOrganizationFullDetail(id: string): Promise<OrgFullDetail | null> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      plan: { select: { id: true, name: true, maxEmployees: true } },
      subscription: {
        select: {
          id: true,
          status: true,
          snapshotPlanName: true,
          snapshotMaxEmployees: true,
          snapshotPriceInCents: true,
          snapshotInterval: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
        },
      },
      users: {
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          departments: true,
          healthSurveyDispatches: true,
          healthSurveyResponses: true,
          documents: true,
        },
      },
      auditLogs: {
        select: { id: true, userId: true, action: true, resource: true, resourceId: true, metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  })

  if (!org) return null

  const [employeeCounts, openAlertCount, totalAlertCount, openReportCount, totalReportCount, openActionPlanCount, totalActionPlanCount, messagesThisMonth, lastPgrReview] = await Promise.all([
    prisma.employee.groupBy({
      by: ["status"],
      where: { tenantId: id, deletedAt: null },
      _count: { status: true },
    }),
    prisma.alert.count({ where: { tenantId: id, resolvedAt: null } }),
    prisma.alert.count({ where: { tenantId: id } }),
    prisma.anonymousReport.count({ where: { tenantId: id, status: { in: ["open", "analyzing"] } } }),
    prisma.anonymousReport.count({ where: { tenantId: id } }),
    prisma.actionPlan.count({ where: { tenantId: id, status: { in: ["open", "in_progress"] } } }),
    prisma.actionPlan.count({ where: { tenantId: id } }),
    prisma.messageLog.count({ where: { tenantId: id, sentAt: { gte: startOfMonth } } }),
    prisma.pgrReview.findFirst({
      where: { tenantId: id },
      orderBy: { reviewedAt: "desc" },
      select: { reviewedAt: true, nextReviewAt: true },
    }),
  ])

  const activeCount = employeeCounts.find((e) => e.status === "active")?._count.status ?? 0
  const inactiveCount = employeeCounts.find((e) => e.status === "inactive")?._count.status ?? 0
  const pausedCount = employeeCounts.find((e) => e.status === "paused")?._count.status ?? 0

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    externalCustomerId: org.externalCustomerId,
    billingStatus: org.billingStatus,
    maxEmployeesOverride: org.maxEmployeesOverride,
    timezone: org.timezone,
    trialExpiresAt: org.trialExpiresAt,
    isActive: org.isActive,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    plan: org.plan,
    subscription: org.subscription,
    users: org.users,
    recentAuditLogs: org.auditLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: null,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      metadata: l.metadata as Record<string, string | number | boolean | null> | null,
      createdAt: l.createdAt,
    })),
    employeeCounts: { active: activeCount, inactive: inactiveCount, paused: pausedCount },
    departmentCount: org._count.departments,
    dispatchCount: org._count.healthSurveyDispatches,
    responseCount: org._count.healthSurveyResponses,
    openAlertCount,
    totalAlertCount,
    reportCount: totalReportCount,
    openReportCount,
    documentCount: org._count.documents,
    actionPlanCount: totalActionPlanCount,
    openActionPlanCount,
    messagesThisMonth,
    lastPgrReview: lastPgrReview ?? null,
    deletionScheduledAt: org.deletionScheduledAt,
  }
}

export interface OrganizationAdminListingFilters {
  q?: string
}

export async function findAllOrganizationsPaginatedAdmin(
  filters: OrganizationAdminListingFilters,
  skip: number,
  take: number,
): Promise<{ items: (Organization & { plan: Plan | null; _count: { employees: number } })[]; total: number }> {
  const where: Prisma.OrganizationWhereInput = {}
  if (filters.q !== undefined) {
    where.name = { contains: filters.q, mode: "insensitive" }
  }
  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: { plan: true, _count: { select: { employees: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.organization.count({ where }),
  ])
  return { items, total }
}

export async function findOrganizationAuditLogsPaginated(
  organizationId: string,
  skip: number,
  take: number,
): Promise<{ items: OrgAuditEntry[]; total: number }> {
  const where: Prisma.AuditLogWhereInput = { tenantId: organizationId }
  const [rawItems, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: { id: true, userId: true, action: true, resource: true, resourceId: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ])

  const userIds = [...new Set(rawItems.map((r) => r.userId).filter((id): id is string => id !== null))]
  const userMap = new Map<string, string>()
  if (userIds.length > 0) {
    const users = await prisma.organizationUser.findMany({
      where: { tenantId: organizationId, id: { in: userIds } },
      select: { id: true, name: true },
    })
    for (const u of users) {
      userMap.set(u.id, u.name)
    }
  }

  const items: OrgAuditEntry[] = rawItems.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.userId !== null ? (userMap.get(row.userId) ?? null) : null,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId,
    metadata: row.metadata as Record<string, string | number | boolean | null> | null,
    createdAt: row.createdAt,
  }))
  return { items, total }
}

export async function setOrganizationTrialExpiresAt(id: string, trialExpiresAt: Date | null): Promise<void> {
  await prisma.organization.update({ where: { id }, data: { trialExpiresAt } })
}

export async function setOrganizationMaxEmployeesOverride(id: string, value: number | null): Promise<void> {
  await prisma.organization.update({ where: { id }, data: { maxEmployeesOverride: value } })
}
