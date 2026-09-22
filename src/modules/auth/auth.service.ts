import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { addHours } from "date-fns"
import { env } from "@/env"
import { getEmailService } from "@/libs/integrations"
import { renderEmailTemplate } from "@/libs/email-templates"
import { AppError } from "@/libs/errors/app-error"
import { logger } from "@/libs/logger"
import { normalizeEmail } from "@/libs/utils/email"
import { createSession, createSuperAdminSession, destroySession, destroySuperAdminSession } from "@/modules/auth/session"
import type { LoginInput, SuperAdminLoginInput, SessionPayload, SafeSuperAdmin } from "@/modules/auth/auth.types"
import {
  findOrgBySlug,
  findOrgUserByEmail,
  findOrgUserById,
  findOrgUserByIdOnly,
  updateOrgUserPassword,
  findSuperAdminByEmail,
  invalidatePreviousResetTokens,
  createPasswordResetToken,
  findAuthToken,
  consumeAuthToken,
  findAllSuperAdmins,
  findSuperAdminsPaginated,
} from "@/modules/auth/auth.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"

const INVALID_CREDENTIALS_MSG = "Credenciais inválidas"

const DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc.0C5EOnf2Hy4P7dymR0Y7nUi"

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function login(input: LoginInput): Promise<SessionPayload> {
  const org = await findOrgBySlug(input.orgSlug)
  if (!org) {
    await bcrypt.compare(input.password, DUMMY_HASH)
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MSG)
  }

  const user = await findOrgUserByEmail(org.id, input.email)
  if (!user?.isActive) {
    await bcrypt.compare(input.password, DUMMY_HASH)
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MSG)
  }

  const valid = await verifyPassword(input.password, user.passwordHash)
  if (!valid) throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MSG)

  if (user.role !== "admin" && user.role !== "rh") throw new AppError("ACCESS_DENIED", "Acesso não permitido")

  const sessionPayload: SessionPayload = {
    userId: user.id,
    tenantId: org.id,
    role: user.role,
    email: user.email,
  }
  await createSession(sessionPayload)
  await createAuditLog({ tenantId: org.id, userId: user.id, action: "user.login", resource: "organization_users", resourceId: user.id })
  return sessionPayload
}

export async function superAdminLogin(input: SuperAdminLoginInput): Promise<void> {
  const admin = await findSuperAdminByEmail(input.email)
  if (!admin) throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MSG)

  const valid = await verifyPassword(input.password, admin.passwordHash)
  if (!valid) throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MSG)

  await createSuperAdminSession({
    adminId: admin.id,
    email: admin.email,
    type: "super_admin",
  })
}

export async function logout(): Promise<void> {
  await destroySession()
}

export async function superAdminLogout(): Promise<void> {
  await destroySuperAdminSession()
}

export async function changePassword(
  userId: string,
  tenantId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await findOrgUserById(userId, tenantId)
  if (!user) throw new AppError("USER_NOT_FOUND", "Usuário não encontrado")

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) throw new AppError("INVALID_PASSWORD", "Senha atual incorreta")

  const newHash = await hashPassword(newPassword)
  await updateOrgUserPassword(userId, tenantId, newHash)
  await createAuditLog({ tenantId, userId, action: "user.password_changed", resource: "organization_users", resourceId: userId, metadata: { event: "password_changed" } })
}

export async function requestPasswordReset(email: string, orgSlug: string): Promise<void> {
  const org = await findOrgBySlug(orgSlug)
  if (!org) return

  const user = await findOrgUserByEmail(org.id, email)
  if (!user?.isActive) return

  await invalidatePreviousResetTokens(user.id)

  const token = randomUUID()
  await createPasswordResetToken(user.id, token, addHours(new Date(), 1))

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`
  const emailService = getEmailService()
  const normalizedEmail = normalizeEmail(email)
  const sendResult = await emailService.send({
    to: normalizedEmail,
    subject: "Redefinição de senha — Pulse",
    html: renderEmailTemplate({ name: "password-reset", props: { resetUrl } }),
  })

  if (sendResult.error !== undefined) {
    logger.error(`falha ao enviar e-mail de redefinição de senha para ${normalizedEmail}: ${sendResult.error}`)
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const authToken = await findAuthToken(token)

  if (authToken?.type !== "password_reset") throw new AppError("INVALID_TOKEN", "Link inválido ou expirado. Solicite um novo.")
  if (authToken.usedAt) throw new AppError("INVALID_TOKEN", "Link inválido ou expirado. Solicite um novo.")
  if (authToken.expiresAt < new Date()) throw new AppError("INVALID_TOKEN", "Link inválido ou expirado. Solicite um novo.")

  const user = await findOrgUserByIdOnly(authToken.userId)
  if (!user) throw new AppError("USER_NOT_FOUND", "Usuário não encontrado.")

  const newHash = await hashPassword(newPassword)
  await consumeAuthToken(authToken.id, authToken.userId, user.tenantId, newHash)
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: "user.password_reset", resource: "organization_users", resourceId: user.id, metadata: { event: "password_reset" } })
}

export function getOrgUserById(userId: string, tenantId: string): ReturnType<typeof findOrgUserById> {
  return findOrgUserById(userId, tenantId)
}



export function listSuperAdmins(): Promise<SafeSuperAdmin[]> {
  return findAllSuperAdmins()
}

interface SuperAdminListingQuery {
  page: number
  pageSize: number
}

export function listSuperAdminsPaginated(
  query: SuperAdminListingQuery,
): ReturnType<typeof findSuperAdminsPaginated> {
  const skip = (query.page - 1) * query.pageSize
  return findSuperAdminsPaginated(skip, query.pageSize)
}
