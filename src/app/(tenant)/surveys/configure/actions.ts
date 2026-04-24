"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { configureSurvey } from "@/modules/surveys/survey-config.service"

const TIME_REGEX = /^\d{2}:\d{2}$/

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().min(1).max(500),
  order: z.number().int().min(1).max(100),
  scoreDirection: z.enum(["higher_is_better", "lower_is_better"]),
  isActive: z.boolean().optional(),
})

const configureSurveySchema = z.object({
  departmentId: z.string().uuid(),
  frequency: z.enum(["daily", "twice_weekly", "weekly", "biweekly", "monthly"]),
  workStartTime: z.string().regex(TIME_REGEX),
  workEndTime: z.string().regex(TIME_REGEX),
  workDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  questions: z.array(questionSchema).min(1).max(20),
})

export async function configureSurveyAction(input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = configureSurveySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await configureSurvey(session.tenantId, parsed.data)
    revalidatePath("/surveys")
    redirect("/surveys")
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
