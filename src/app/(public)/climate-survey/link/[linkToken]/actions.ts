"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { unlockClimateSurveyViaIdentifier } from "@/modules/climate-surveys/climate-survey-response.service"
import { AppError } from "@/libs/errors/app-error"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"
import type { ActionResult } from "@/libs/utils/action-result"

interface UnlockActionResult extends ActionResult {
  needsConsent?: boolean
  consentToken?: string
  employeeName?: string
  consentTermContent?: string | null
}

export async function unlockClimateSurveyAction(
  linkToken: string,
  identifier: string,
): Promise<UnlockActionResult> {
  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:survey-unlock:${ip}`, 10, 60)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    const result = await unlockClimateSurveyViaIdentifier(linkToken, identifier)

    if (result.alreadyAnswered) {
      return { error: "Você já respondeu esta pesquisa." }
    }

    if (result.needsConsent === true) {
      const consentResult: UnlockActionResult = {
        needsConsent: true,
        consentToken: result.token,
      }
      if (result.employeeName !== undefined) consentResult.employeeName = result.employeeName
      if (result.consentTermContent !== undefined) consentResult.consentTermContent = result.consentTermContent
      return consentResult
    }

    redirect(`/climate-survey/${result.token}`)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
