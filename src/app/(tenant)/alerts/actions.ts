"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { markRead, resolve } from "@/modules/alerts/alert.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const alertIdSchema = z.string().uuid()

export async function markAlertReadAction(alertId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = alertIdSchema.safeParse(alertId)
  if (!parsed.success) return { error: "ID inválido." }
  try {
    await markRead(session.tenantId, parsed.data)
    revalidatePath("/alerts")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function resolveAlertAction(alertId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = alertIdSchema.safeParse(alertId)
  if (!parsed.success) return { error: "ID inválido." }
  try {
    await resolve(session.tenantId, parsed.data)
    revalidatePath("/alerts")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
