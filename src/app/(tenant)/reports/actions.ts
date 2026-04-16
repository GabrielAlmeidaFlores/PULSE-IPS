"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { updateReportStatus } from "@/modules/anonymous-reports/anonymous-report.service"
import type { UpdateAnonymousReportInput } from "@/modules/anonymous-reports/anonymous-report.types"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function updateReportStatusAction(
  reportId: string,
  input: UpdateAnonymousReportInput,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await updateReportStatus(session.tenantId, reportId, input)
    revalidatePath("/reports")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
