"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { submitClimateSurveyResponse } from "@/modules/climate-surveys/climate-survey-response.service"
import {
  startClimateSurveyResponseSession,
  trackClimateSurveyResponseProgress,
} from "@/modules/climate-surveys/climate-survey-analytics.service"
import { optOutFromClimateSurveyToken, acceptConsentFromClimateSurveyToken, refuseConsentFromClimateSurveyToken } from "@/modules/consent/consent.service"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"

const UNEXPECTED_ERROR_MESSAGE = "Ocorreu um erro inesperado."

const climateSurveyAnswerSchema = z.object({
  questionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
})

const submitClimateSurveySchema = z.object({
  token: z.string().min(1).max(255),
  answers: z.array(climateSurveyAnswerSchema).min(1).max(50),
})

export async function submitClimateSurveyAction(
  token: string,
  answers: { questionId: string; score: number }[],
): Promise<ActionResult> {
  const parsed = submitClimateSurveySchema.safeParse({ token, answers })
  if (!parsed.success) return { error: "Dados inválidos." }

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:survey-submit:${ip}`, 5, 60)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    await submitClimateSurveyResponse(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function startClimateSurveyResponseSessionAction(token: string): Promise<ActionResult> {
  const parsed = z.string().min(1).max(255).safeParse(token)
  if (!parsed.success) return { error: "Token inválido." }

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:climate-survey-start:${ip}`, 30, 60)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    await startClimateSurveyResponseSession(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function trackClimateSurveyResponseProgressAction(
  token: string,
  questionId: string,
  questionOrder: number,
): Promise<ActionResult> {
  const parsed = z
    .object({
      token: z.string().min(1).max(255),
      questionId: z.string().uuid(),
      questionOrder: z.number().int().min(0).max(500),
    })
    .safeParse({ token, questionId, questionOrder })
  if (!parsed.success) return { error: "Dados inválidos." }

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:climate-survey-progress:${ip}`, 60, 60)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    await trackClimateSurveyResponseProgress(
      parsed.data.token,
      parsed.data.questionId,
      parsed.data.questionOrder,
    )
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function optOutClimateSurveyAction(token: string): Promise<ActionResult> {
  try {
    await optOutFromClimateSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function acceptClimateSurveyConsentAction(token: string): Promise<ActionResult> {
  try {
    await acceptConsentFromClimateSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}

export async function refuseClimateSurveyConsentAction(token: string): Promise<ActionResult> {
  try {
    await refuseConsentFromClimateSurveyToken(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE }
  }
}
