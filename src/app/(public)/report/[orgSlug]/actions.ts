"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { submitReport } from "@/modules/anonymous-reports/anonymous-report.service"
import { AppError } from "@/libs/errors/app-error"

const submitReportSchema = z.object({
  content: z.string().min(10).max(5000),
  category: z.string().max(100).optional(),
})

export async function submitReportAction(
  orgSlug: string,
  input: { content: string; category?: string | undefined },
): Promise<ActionResult> {
  const parsed = submitReportSchema.safeParse(input)
  if (!parsed.success) return { error: "Conteúdo inválido." }
  try {
    await submitReport(orgSlug, { ...parsed.data, orgSlug })
    return {}
  } catch (error) {
    if (error instanceof AppError && error.code === "ORGANIZATION_NOT_FOUND") return {}
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
