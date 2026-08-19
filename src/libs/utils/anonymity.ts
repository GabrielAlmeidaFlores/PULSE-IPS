import { env } from "@/env"

export const MINIMUM_RESPONDENTS_FOR_DISPLAY = env.HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY

export function canRevealSurveyGroupResults(respondentCount: number): boolean {
  return respondentCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY
}

export function toAnonymousSurveyResponseDate(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
