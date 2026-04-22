"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { generatePgrReport } from "@/modules/pgr/pgr.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use YYYY-MM.")

export async function generatePgrReportAction(period: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = periodSchema.safeParse(period)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Período inválido." }
  try {
    await generatePgrReport(session.tenantId, parsed.data)
    revalidatePath("/pgr")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
