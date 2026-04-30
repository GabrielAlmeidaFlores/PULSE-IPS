import { getBillingService } from "@/libs/integrations"
import {
  findOrganizationById,
  findOrganizationBySlug,
  findAllOrganizations,
  findAllOrganizationsPaginatedAdmin,
  createOrganization,
  updateOrganization,
  updateOrganizationCustomerId,
  findOrganizationForAdmin,
  findOrganizationBilling,
  findAllOrganizationsForExport,
  findOrganizationFullDetail,
  type OrganizationAdminListingFilters,
} from "@/modules/organizations/organization.repository"
import type { CreateOrganizationInput, UpdateOrganizationInput, Organization } from "@/modules/organizations/organization.types"
import { AppError } from "@/libs/errors/app-error"

export function getOrganization(tenantId: string): Promise<Organization | null> {
  return findOrganizationById(tenantId)
}

export function getAllOrganizations(): ReturnType<typeof findAllOrganizations> {
  return findAllOrganizations()
}

export async function createOrg(input: CreateOrganizationInput): Promise<Organization> {
  const existing = await findOrganizationBySlug(input.slug)
  if (existing) throw new AppError("SLUG_TAKEN", "Este identificador já está em uso.")

  const billing = getBillingService()
  const customer = await billing.createCustomer(
    `${input.slug}@pulse.app`,
    input.name,
  )

  const org = await createOrganization(input)
  await updateOrganizationCustomerId(org.id, customer.id)
  return org
}

export function updateOrg(tenantId: string, input: UpdateOrganizationInput): Promise<Organization> {
  return updateOrganization(tenantId, input)
}

export function getOrganizationForAdmin(id: string): ReturnType<typeof findOrganizationForAdmin> {
  return findOrganizationForAdmin(id)
}

export function getOrganizationBilling(id: string): ReturnType<typeof findOrganizationBilling> {
  return findOrganizationBilling(id)
}

export function getOrganizationsForExport(): ReturnType<typeof findAllOrganizationsForExport> {
  return findAllOrganizationsForExport()
}

export function getOrganizationFullDetail(id: string): ReturnType<typeof findOrganizationFullDetail> {
  return findOrganizationFullDetail(id)
}

interface OrganizationAdminListingQuery {
  q?: string
  page: number
  pageSize: number
}

export function getAllOrganizationsPaginatedAdmin(
  query: OrganizationAdminListingQuery,
): ReturnType<typeof findAllOrganizationsPaginatedAdmin> {
  const skip = (query.page - 1) * query.pageSize
  const filters: OrganizationAdminListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  return findAllOrganizationsPaginatedAdmin(filters, skip, query.pageSize)
}

