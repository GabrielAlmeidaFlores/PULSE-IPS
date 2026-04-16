"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { configureSurvey } from "@/modules/surveys/survey.service"
import type { CreateSurveyConfigInput } from "@/modules/surveys/survey.types"


export async function configureSurveyAction(input: CreateSurveyConfigInput): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!input.departmentId) return { error: "Departamento é obrigatório." }
  if (!input.workStartTime || !input.workEndTime) return { error: "Horário de trabalho é obrigatório." }
  if (input.questions.length === 0) return { error: "Adicione ao menos uma pergunta." }
  try {
    await configureSurvey(session.tenantId, input)
    revalidatePath("/surveys")
    redirect("/surveys")
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
