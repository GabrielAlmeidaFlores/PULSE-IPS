"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { submitReport } from "@/modules/anonymous-reports/anonymous-report.service"


export async function submitReportAction(
  orgSlug: string,
  input: { content: string; category?: string | undefined },
): Promise<ActionResult> {
  try {
    await submitReport(orgSlug, { ...input, orgSlug })
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
