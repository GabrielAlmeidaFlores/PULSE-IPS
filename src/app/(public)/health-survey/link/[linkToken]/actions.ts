"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { unlockHealthSurveyViaIdentifier } from "@/modules/health-surveys/health-survey-response.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

interface UnlockActionResult extends ActionResult {
  needsConsent?: boolean
  consentToken?: string
  employeeName?: string
  consentTermContent?: string | null
}

export async function unlockHealthSurveyAction(
  linkToken: string,
  identifier: string,
): Promise<UnlockActionResult> {
  try {
    const result = await unlockHealthSurveyViaIdentifier(linkToken, identifier)

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

    redirect(`/health-survey/${result.token}`)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
