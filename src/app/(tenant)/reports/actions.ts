"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { updateReportStatus } from "@/modules/anonymous-reports/anonymous-report.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["open", "analyzing", "resolved", "archived"]),
  notes: z.string().max(2000).optional(),
})

export async function updateReportStatusAction(
  reportId: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = updateReportSchema.safeParse({ reportId, ...(input as object) })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updateReportStatus(session.tenantId, parsed.data.reportId, parsed.data)
    revalidatePath("/reports")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
