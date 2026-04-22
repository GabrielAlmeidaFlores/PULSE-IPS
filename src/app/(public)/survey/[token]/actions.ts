"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { submitSurveyResponse } from "@/modules/surveys/survey.service"
import { optOutFromSurveyToken, acceptConsentFromSurveyToken, refuseConsentFromSurveyToken } from "@/modules/consent/consent.service"


const UNEXPECTED_ERROR_MESSAGE = "Ocorreu um erro inesperado."

export async function submitSurveyAction(
  token: string,
  answers: { questionId: string; score: number }[],
): Promise<ActionResult> {
  try {
    await submitSurveyResponse({ token, answers })
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
