"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { updateHealthSurveyConfig } from "@/modules/health-surveys/health-survey-config.service"

const questionSchema = z.object({
  text: z.string().min(1).max(500),
  order: z.number().int().min(1).max(100),
  scoreDirection: z.enum(["higher_is_better", "lower_is_better"]),
})

const TIME_REGEX = /^\d{2}:\d{2}$/

const updateHealthSurveyConfigSchema = z.object({
  name: z.string().min(1, "Informe o nome da pesquisa").max(255),
  description: z.string().max(500).optional().transform((v) => (v?.trim() ? v.trim() : undefined)),
  frequency: z.enum(["daily", "twice_weekly", "weekly", "biweekly", "monthly"]),
  scheduledDayOfMonth: z.number().int().min(1).max(28).nullable(),
  dispatchTime: z.string().regex(TIME_REGEX),
  workDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  respectEmployeeSchedule: z.boolean(),
  tokenExpiryHours: z.number().int().min(1).max(1000).default(48),
  questions: z.array(questionSchema).min(1, "Adicione ao menos uma pergunta").max(20),
  departmentIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um setor."),
})

export async function updateHealthSurveyConfigAction(configId: string, input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedConfigId = z.string().uuid().safeParse(configId)
  if (!parsedConfigId.success) return { error: "Pesquisa inválida." }

  const parsed = updateHealthSurveyConfigSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const { name, description, frequency, scheduledDayOfMonth: rawScheduledDay, dispatchTime, workDays, respectEmployeeSchedule, tokenExpiryHours, questions, departmentIds } = parsed.data
  const scheduledDayOfMonth = frequency === "monthly" ? rawScheduledDay : null

  if (frequency === "monthly" && scheduledDayOfMonth === null) {
    return { error: "Selecione o dia do mês para o envio mensal." }
  }

  try {
    await updateHealthSurveyConfig(session.tenantId, parsedConfigId.data, {
      name,
      description,
      frequency,
      scheduledDayOfMonth,
      dispatchTime,
      workDays,
      respectEmployeeSchedule,
      tokenExpiryHours,
      questions,
      departmentIds,
    })

    revalidatePath("/health-surveys/configure")
    redirect("/health-surveys/configure")
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
