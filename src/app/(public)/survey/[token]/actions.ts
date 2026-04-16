"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { submitSurveyResponse } from "@/modules/surveys/survey.service"
import { optOutFromSurvey } from "@/modules/consent/consent.service"


export async function submitSurveyAction(
  token: string,
  answers: { questionId: string; score: number }[],
): Promise<ActionResult> {
  try {
    await submitSurveyResponse({ token, answers })
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}

export async function optOutSurveyAction(token: string): Promise<ActionResult> {
  try {
    await optOutFromSurvey(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
