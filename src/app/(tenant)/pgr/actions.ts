"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { generatePgrReport } from "@/modules/pgr/pgr.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function generatePgrReportAction(period: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!period) return { error: "Período é obrigatório." }
  try {
    await generatePgrReport(session.tenantId, period)
    revalidatePath("/pgr")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
