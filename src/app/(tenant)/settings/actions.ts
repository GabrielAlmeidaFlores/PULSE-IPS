"use server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { updateOrg } from "@/modules/organizations/organization.service"
import { assertOrgAdmin } from "@/libs/auth/permissions"
import { sendInvite } from "@/modules/auth/invite.service"
import { changePassword } from "@/modules/auth/auth.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function updateOrganizationAction(input: {
  name: string
  timezone: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  assertOrgAdmin(session)
  if (!input.name.trim()) return { error: "Nome é obrigatório." }
  try {
    await updateOrg(session.tenantId, { name: input.name.trim(), timezone: input.timezone })
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
  if (!session) return { error: "Sessão expirada." }
  assertOrgAdmin(session)
  if (!input.email.trim()) return { error: "Email é obrigatório." }
  try {
    await sendInvite(session.tenantId, input.email.trim(), input.role)
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
  if (!session) return { error: "Sessão expirada." }
  if (input.newPassword.length < 8) return { error: "A nova senha deve ter pelo menos 8 caracteres." }
  if (input.newPassword !== input.confirmPassword) return { error: "As senhas não coincidem." }
  try {
    await changePassword(session.userId, session.tenantId, input.currentPassword, input.newPassword)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
