"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { submitSurveyResponse } from "@/modules/surveys/survey-response.service"
import { optOutFromSurveyToken, acceptConsentFromSurveyToken, refuseConsentFromSurveyToken } from "@/modules/consent/consent.service"

const UNEXPECTED_ERROR_MESSAGE = "Ocorreu um erro inesperado."

const answerSchema = z.object({
  questionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
})

const submitSurveySchema = z.object({
  token: z.string().min(1).max(255),
  answers: z.array(answerSchema).min(1).max(50),
})

export async function submitSurveyAction(
  token: string,
  answers: { questionId: string; score: number }[],
): Promise<ActionResult> {
  const parsed = submitSurveySchema.safeParse({ token, answers })
  if (!parsed.success) return { error: "Dados inválidos." }
  try {
    await submitSurveyResponse(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function optOutSurveyAction(token: string): Promise<ActionResult> {
  try {
    await optOutFromSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function acceptConsentAction(token: string): Promise<ActionResult> {
  try {
    await acceptConsentFromSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function refuseConsentAction(token: string): Promise<ActionResult> {
  try {
    await refuseConsentFromSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}
