import type { Organization, Plan, OrganizationSubscription } from "@prisma/client"
import { prisma } from "@/libs/db"
import type { CreateOrganizationInput, UpdateOrganizationInput } from "@/modules/organizations/organization.types"

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
          employees: { where: { status: "active" } },
        },
      },
    },
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
