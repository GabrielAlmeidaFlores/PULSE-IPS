"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { submitSurveyResponse } from "@/modules/health-surveys/health-survey-response.service"
import { optOutFromHealthSurveyToken, acceptConsentFromHealthSurveyToken, refuseConsentFromHealthSurveyToken } from "@/modules/consent/consent.service"

const UNEXPECTED_ERROR_MESSAGE = "Ocorreu um erro inesperado."

const healthSurveyAnswerSchema = z.object({
  questionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
})

const submitHealthSurveySchema = z.object({
  token: z.string().min(1).max(255),
  answers: z.array(healthSurveyAnswerSchema).min(1).max(50),
})

export async function submitHealthSurveyAction(
  token: string,
  answers: { questionId: string; score: number }[],
): Promise<ActionResult> {
  const parsed = submitHealthSurveySchema.safeParse({ token, answers })
  if (!parsed.success) return { error: "Dados inválidos." }
  try {
    await submitSurveyResponse(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function optOutHealthSurveyAction(token: string): Promise<ActionResult> {
  try {
    await optOutFromHealthSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function acceptConsentAction(token: string): Promise<ActionResult> {
  try {
    await acceptConsentFromHealthSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function refuseConsentAction(token: string): Promise<ActionResult> {
  try {
    await refuseConsentFromHealthSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}
