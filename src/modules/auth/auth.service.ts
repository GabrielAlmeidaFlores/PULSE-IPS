import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { addHours } from "date-fns"
import { env } from "@/env"
import { getEmailService } from "@/libs/integrations"
import { renderEmailTemplate } from "@/libs/email-templates"
import { AppError } from "@/libs/errors/app-error"
import { createSession, createSuperAdminSession, destroySession, destroySuperAdminSession } from "@/modules/auth/session"
import type { LoginInput, SuperAdminLoginInput, SessionPayload } from "@/modules/auth/auth.types"
import type { SuperAdmin } from "@prisma/client"
import {
  findOrgBySlug,
  findOrgUserByEmail,
  findOrgUserById,
  updateOrgUserPassword,
  findSuperAdminByEmail,
  invalidatePreviousResetTokens,
  createPasswordResetToken,
  findAuthToken,
  consumeAuthToken,
  findAllSuperAdmins,
} from "@/modules/auth/auth.repository"

const INVALID_CREDENTIALS_MSG = "Credenciais inválidas"

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function login(input: LoginInput): Promise<SessionPayload> {
  const org = await findOrgBySlug(input.orgSlug)
  if (!org) throw new AppError("ORG_NOT_FOUND", "Organização não encontrada")

  const user = await findOrgUserByEmail(org.id, input.email)
  if (!user?.isActive) throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MSG)

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
  await updateOrgUserPassword(userId, newHash)
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
  await emailService.send({
    to: email,
    subject: "Redefinição de senha — Pulse",
    html: renderEmailTemplate({ name: "password-reset", props: { resetUrl } }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const authToken = await findAuthToken(token)

  if (authToken?.type !== "password_reset") throw new AppError("INVALID_TOKEN", "Link inválido ou expirado.")
  if (authToken.usedAt) throw new AppError("TOKEN_USED", "Este link já foi utilizado.")
  if (authToken.expiresAt < new Date()) throw new AppError("TOKEN_EXPIRED", "Este link expirou. Solicite um novo.")

  const newHash = await hashPassword(newPassword)
  await consumeAuthToken(authToken.id, authToken.userId, newHash)
}

export function getOrgUserById(userId: string, tenantId: string): ReturnType<typeof findOrgUserById> {
  return findOrgUserById(userId, tenantId)
}



export function listSuperAdmins(): Promise<SuperAdmin[]> {
  return findAllSuperAdmins()
}
