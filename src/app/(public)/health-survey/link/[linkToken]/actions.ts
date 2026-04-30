"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { unlockHealthSurveyViaIdentifier } from "@/modules/health-surveys/health-survey-response.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

export async function unlockHealthSurveyAction(
  linkToken: string,
  identifier: string,
): Promise<ActionResult> {
  try {
    const result = await unlockHealthSurveyViaIdentifier(linkToken, identifier)

    if (result.alreadyAnswered) {
      return { error: "Você já respondeu esta pesquisa." }
    }

    redirect(`/health-survey/${result.token}`)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
