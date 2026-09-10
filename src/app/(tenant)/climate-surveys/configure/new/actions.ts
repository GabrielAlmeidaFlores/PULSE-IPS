"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { createClimateSurveyForDepartments } from "@/modules/climate-surveys/climate-survey-config.service"
import { CLIMATE_SURVEY_MAX_QUESTIONS } from "@/modules/climate-surveys/climate-survey.types"

const questionSchema = z.object({
  text: z.string().min(1).max(500),
  order: z.number().int().min(1).max(100),
  scoreDirection: z.enum(["higher_is_better", "lower_is_better"]),
  dimension: z.string().trim().min(1).max(60),
})

const TIME_REGEX = /^\d{2}:\d{2}$/

const createClimateSurveyConfigSchema = z.object({
  name: z.string().min(1, "Informe o nome da pesquisa").max(255),
  description: z.string().max(500).optional().transform((v) => (v?.trim() ? v.trim() : undefined)),
  departmentIds: z.union([z.literal("all"), z.array(z.string().uuid()).min(1, "Selecione ao menos um setor")]),
  frequency: z.enum(["once", "daily", "twice_weekly", "weekly", "biweekly", "monthly", "quarterly", "semiannual"]),
  scheduledDayOfMonth: z.number().int().min(1).max(28).nullable(),
  dispatchTime: z.string().regex(TIME_REGEX),
  workDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  respectEmployeeSchedule: z.boolean(),
  tokenExpiryHours: z.number().int().min(1).max(1000).default(48),
  sendViaMessaging: z.boolean(),
  sendViaSignedLink: z.boolean(),
  questions: z.array(questionSchema).min(1, "Adicione ao menos uma pergunta").max(CLIMATE_SURVEY_MAX_QUESTIONS),
})

export async function createClimateSurveyConfigAction(input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsed = createClimateSurveyConfigSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const {
    name,
    description,
    departmentIds,
    frequency,
    scheduledDayOfMonth,
    dispatchTime,
    workDays,
    respectEmployeeSchedule,
    tokenExpiryHours,
    sendViaMessaging,
    sendViaSignedLink,
    questions,
  } = parsed.data

  if (frequency === "monthly" && scheduledDayOfMonth === null) {
    return { error: "Selecione o dia do mês para o envio mensal." }
  }

  if (!sendViaMessaging && !sendViaSignedLink) {
    return { error: "Selecione ao menos um canal de envio." }
  }

  try {
    await createClimateSurveyForDepartments(session.tenantId, {
      name,
      ...(description !== undefined && { description }),
      departmentIds,
      frequency,
      scheduledDayOfMonth,
      dispatchTime,
      workDays,
      respectEmployeeSchedule,
      tokenExpiryHours,
      sendViaMessaging,
      sendViaSignedLink,
      questions,
    })
    revalidatePath("/climate-surveys/configure")
    redirect("/climate-surveys/configure")
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
