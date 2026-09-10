"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { generateWorkforceInsightsWithAI } from "@/modules/workforce/workforce-insights.service"

const competenciaSchema = z.string().regex(/^\d{4}-\d{2}$/, "Competência inválida.").optional()

export async function generateWorkforceInsightsAction(competencia?: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsed = competenciaSchema.safeParse(competencia)
  if (!parsed.success) return { error: "Competência inválida." }

  try {
    await generateWorkforceInsightsWithAI(session.tenantId, parsed.data)
    revalidatePath("/workforce/insights")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
