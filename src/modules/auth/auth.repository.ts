import { prisma } from "@/libs/db"
import type { Organization, OrganizationUser, AuthToken, SuperAdmin, OrganizationInvitation } from "@prisma/client"
import type { CreateOrgInvitationInput, AcceptInviteInput } from "@/modules/auth/auth.types"

export function findOrgBySlug(slug: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { slug, isActive: true } })
}

export function findOrgUserByEmail(tenantId: string, email: string): Promise<OrganizationUser | null> {
  return prisma.organizationUser.findUnique({
    where: { tenantId_email: { tenantId, email } },
  })
}

export function findOrgUserById(userId: string, tenantId: string): Promise<OrganizationUser | null> {
  return prisma.organizationUser.findFirst({ where: { id: userId, tenantId } })
}

export async function updateOrgUserPassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.organizationUser.update({ where: { id: userId }, data: { passwordHash } })
}

export function findSuperAdminByEmail(email: string): Promise<SuperAdmin | null> {
  return prisma.superAdmin.findUnique({ where: { email } })
}

export async function invalidatePreviousResetTokens(userId: string): Promise<void> {
  await prisma.authToken.updateMany({
    where: { userId, type: "password_reset", usedAt: null },
    data: { usedAt: new Date() },
  })
}

export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await prisma.authToken.create({
    data: { userId, type: "password_reset", token, expiresAt },
  })
}

export function findAuthToken(token: string): Promise<AuthToken | null> {
  return prisma.authToken.findUnique({ where: { token } })
}

export async function consumeAuthToken(tokenId: string, userId: string, newPasswordHash: string): Promise<void> {
  await prisma.$transaction([
    prisma.organizationUser.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } }),
    prisma.authToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
  ])
}

export function findOrgInviteByToken(token: string): Promise<(OrganizationInvitation & { organization: Organization }) | null> {
  return prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: true },
  })
}

export async function createOrgInvitation(data: CreateOrgInvitationInput): Promise<void> {
  await prisma.organizationInvitation.create({ data })
}

export function findOrgByIdOrThrow(tenantId: string): Promise<Organization> {
  return prisma.organization.findUniqueOrThrow({ where: { id: tenantId } })
}

export function findOrgUserByEmailInTenant(tenantId: string, email: string): Promise<OrganizationUser | null> {
  return findOrgUserByEmail(tenantId, email)
}

export async function acceptInviteTransaction(data: AcceptInviteInput): Promise<void> {
  await prisma.$transaction([
    prisma.organizationUser.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.organizationInvitation.update({
      where: { id: data.invitationId },
      data: { usedAt: new Date() },
    }),
  ])
}

export function findOrgUsersByTenant(tenantId: string): Promise<OrganizationUser[]> {
  return prisma.organizationUser.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  })
}

export function findAllSuperAdmins(): Promise<SuperAdmin[]> {
  return prisma.superAdmin.findMany({ orderBy: { createdAt: "asc" } })
}
