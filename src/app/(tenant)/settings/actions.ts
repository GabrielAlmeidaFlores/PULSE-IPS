"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getSession } from "@/modules/auth/session"
import { updateOrg } from "@/modules/organizations/organization.service"
import { assertOrgAdmin } from "@/libs/auth/permissions"
import { sendInvite } from "@/modules/auth/invite.service"
import { changePassword } from "@/modules/auth/auth.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

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
  email: z.string().email().max(255),
  role: z.enum(["admin", "rh"]),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "As senhas não coincidem.", path: ["confirmPassword"] })

export async function updateOrganizationAction(input: {
  name: string
  timezone: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
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
  if (!session) return { error: "Sessão expirada." }
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

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
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
