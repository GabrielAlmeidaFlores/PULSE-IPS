"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { updateHealthSurveyConfig, createHealthSurveyForDepartments, deactivateHealthSurveyConfig, getHealthSurveyConfig } from "@/modules/health-surveys/health-survey-config.service"

const questionSchema = z.object({
  text: z.string().min(1).max(500),
  order: z.number().int().min(1).max(100),
  scoreDirection: z.enum(["higher_is_better", "lower_is_better"]),
})

const TIME_REGEX = /^\d{2}:\d{2}$/

const updateHealthSurveyConfigSchema = z.object({
  name: z.string().min(1, "Informe o nome da pesquisa").max(255),
  description: z.string().max(500).optional().transform((v) => v ?? ""),
  frequency: z.enum(["daily", "twice_weekly", "weekly", "biweekly", "monthly"]),
  scheduledDayOfMonth: z.number().int().min(1).max(28).nullable(),
  workStartTime: z.string().regex(TIME_REGEX),
  workEndTime: z.string().regex(TIME_REGEX),
  workDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  questions: z.array(questionSchema).min(1, "Adicione ao menos uma pergunta").max(20),
  departmentIds: z.union([z.array(z.string().uuid()), z.literal("all")]),
})

export async function updateHealthSurveyConfigAction(configId: string, input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsed = updateHealthSurveyConfigSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const { name, description, frequency, scheduledDayOfMonth, workStartTime, workEndTime, workDays, questions, departmentIds } = parsed.data

  if (frequency === "monthly" && scheduledDayOfMonth === null) {
    return { error: "Selecione o dia do mês para o envio mensal." }
  }

  const selectedDeptIds = departmentIds === "all" ? [] : departmentIds
  if (selectedDeptIds.length === 0 && departmentIds !== "all") {
    return { error: "Selecione ao menos um setor." }
  }

  try {
    const currentConfig = await getHealthSurveyConfig(session.tenantId, configId)
    if (!currentConfig) return { error: "Pesquisa não encontrada." }

    const currentDeptId = currentConfig.department.id
    const configUpdate = { name, description, frequency, scheduledDayOfMonth, workStartTime, workEndTime, workDays, questions }

    if (departmentIds === "all" || selectedDeptIds.includes(currentDeptId)) {
      await updateHealthSurveyConfig(session.tenantId, configId, configUpdate)
    } else {
      await deactivateHealthSurveyConfig(session.tenantId, configId)
    }

    const newDeptIds = departmentIds === "all" ? [] : selectedDeptIds.filter((id) => id !== currentDeptId)
    if (newDeptIds.length > 0) {
      await createHealthSurveyForDepartments(session.tenantId, {
        departmentIds: newDeptIds,
        name,
        description,
        frequency,
        scheduledDayOfMonth,
        workStartTime,
        workEndTime,
        workDays,
        questions,
      })
    }

    revalidatePath("/health-surveys/configure")
    redirect("/health-surveys/configure")
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
