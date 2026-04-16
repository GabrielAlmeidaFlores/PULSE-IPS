export type OrgUserRole = "admin" | "rh"
export type SuperAdminActorType = "super_admin"
export type OrgActorType = "org_user"

export interface OrgSessionContext {
  userId: string
  tenantId: string
  role: OrgUserRole
}

export interface SuperAdminSessionContext {
  adminId: string
}

export function isOrgAdmin(context: OrgSessionContext): boolean {
  return context.role === "admin"
}

export function isOrgRh(context: OrgSessionContext): boolean {
  return context.role === "rh"
}

export function assertOrgAdmin(context: OrgSessionContext): void {
  if (context.role !== "admin") {
    throw new Error("FORBIDDEN: requires admin role")
  }
}

export function assertOrgMember(context: OrgSessionContext, tenantId: string): void {
  if (context.tenantId !== tenantId) {
    throw new Error("FORBIDDEN: tenant mismatch")
  }
}
