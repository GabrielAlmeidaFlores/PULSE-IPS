export type { OrganizationUser } from "@prisma/client"

export interface SafeOrgUser {
  id: string
  tenantId: string
  email: string
  name: string
  role: string
  isActive: boolean
  emailVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SafeSuperAdmin {
  id: string
  name: string
  email: string
  createdAt: Date
}

export interface SessionPayload {
  userId: string
  tenantId: string
  role: "admin" | "rh"
  email: string
}

export interface SuperAdminSessionPayload {
  adminId: string
  email: string
  type: "super_admin"
}

export interface LoginInput {
  orgSlug: string
  email: string
  password: string
}

export interface SuperAdminLoginInput {
  email: string
  password: string
}

export interface CreateOrgInvitationInput {
  tenantId: string
  email: string
  role: string
  token: string
  expiresAt: Date
}

export interface AcceptInviteInput {
  tenantId: string
  email: string
  passwordHash: string
  name: string
  role: string
  invitationId: string
}
