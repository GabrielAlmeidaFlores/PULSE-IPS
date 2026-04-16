export interface Organization {
  id: string
  name: string
  slug: string
  planId: string | null
  externalCustomerId: string | null
  billingStatus: string
  maxEmployeesOverride: number | null
  timezone: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateOrganizationInput {
  name: string
  slug: string
  planId?: string
  timezone?: string
}

export interface UpdateOrganizationInput {
  name?: string
  timezone?: string
  isActive?: boolean
  maxEmployeesOverride?: number | null
}
