"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getSession } from "@/modules/auth/session"
import { updateOrg } from "@/modules/organizations/organization.service"
import { assertOrgAdmin } from "@/libs/auth/permissions"
import { sendInvite, resendOrgInvite, cancelOrgInvite } from "@/modules/auth/invite.service"
import { changePassword, getOrgUserById } from "@/modules/auth/auth.service"
import { requestAccountDeletionCode, confirmAccountDeletion, cancelScheduledOrganizationDeletion } from "@/modules/organizations/account-deletion.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const SESSION_EXPIRED_ERROR = "Sessão expirada."

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  timezone: z.string().min(1).max(100).refine(isValidIanaTimezone, { message: "Fuso horário inválido." }),
})

const inviteUserSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }).max(255),
  role: z.enum(["admin", "rh"]),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Informe a senha atual." }).max(128),
  newPassword: z.string().min(8, { message: "A nova senha deve ter no mínimo 8 caracteres." }).max(128, { message: "A nova senha deve ter no máximo 128 caracteres." }),
  confirmPassword: z.string().min(8, { message: "A confirmação deve ter no mínimo 8 caracteres." }).max(128, { message: "A confirmação deve ter no máximo 128 caracteres." }),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "As senhas não coincidem.", path: ["confirmPassword"] })

export async function updateOrganizationAction(input: {
  name: string
  timezone: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  const parsed = updateOrgSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updateOrg(session.tenantId, { name: parsed.data.name, timezone: parsed.data.timezone })
    revalidatePath("/settings")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function inviteUserAction(input: {
  email: string
  role: "admin" | "rh"
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  const parsed = inviteUserSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await sendInvite(session.tenantId, parsed.data.email, parsed.data.role, session.userId)
    revalidatePath("/settings")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function resendOrgInviteAction(inviteId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  const idParsed = z.string().uuid().safeParse(inviteId)
  if (!idParsed.success) return { error: "Convite inválido." }
  try {
    await resendOrgInvite(session.tenantId, idParsed.data, session.userId)
    revalidatePath("/settings")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function cancelOrgInviteAction(inviteId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  const idParsed = z.string().uuid().safeParse(inviteId)
  if (!idParsed.success) return { error: "Convite inválido." }
  try {
    await cancelOrgInvite(session.tenantId, idParsed.data, session.userId)
    revalidatePath("/settings")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await changePassword(session.userId, session.tenantId, parsed.data.currentPassword, parsed.data.newPassword)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function requestAccountDeletionAction(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  try {
    const user = await getOrgUserById(session.userId, session.tenantId)
    if (!user) return { error: "Usuário não encontrado." }
    await requestAccountDeletionCode(session.tenantId, session.userId, user.email, user.name)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

const confirmAccountDeletionSchema = z.object({
  code: z.string().length(6, { message: "O código deve ter 6 dígitos." }).regex(/^\d+$/, { message: "O código deve conter apenas números." }),
})

interface ConfirmDeletionResult extends ActionResult {
  deletionScheduledAt?: string
}

export async function confirmAccountDeletionAction(input: { code: string }): Promise<ConfirmDeletionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  const parsed = confirmAccountDeletionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Código inválido." }
  try {
    const user = await getOrgUserById(session.userId, session.tenantId)
    if (!user) return { error: "Usuário não encontrado." }
    const { deletionScheduledAt } = await confirmAccountDeletion(session.tenantId, session.userId, user.email, parsed.data.code)
    return { deletionScheduledAt: deletionScheduledAt.toISOString() }
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function cancelOrganizationDeletionAction(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: SESSION_EXPIRED_ERROR }
  assertOrgAdmin(session)
  try {
    await cancelScheduledOrganizationDeletion(session.tenantId)
    revalidatePath("/", "layout")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
