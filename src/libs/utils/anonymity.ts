import { env } from "@/env"

export const MINIMUM_RESPONDENTS_FOR_DISPLAY = env.HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY

export function canRevealSurveyGroupResults(respondentCount: number): boolean {
  return respondentCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY
}

export const CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR = 3

export function climateSurveyRequiredRespondents(
  totalRecipients: number,
  minRespondentsPercent: number,
): number {
  if (totalRecipients <= 0) return Number.POSITIVE_INFINITY
  const requiredByPercent = Math.ceil((totalRecipients * minRespondentsPercent) / 100)
  return Math.max(CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR, requiredByPercent)
}

export function canRevealClimateSurveyGroupResults(
  respondentCount: number,
  totalRecipients: number,
  minRespondentsPercent: number,
): boolean {
  return respondentCount >= climateSurveyRequiredRespondents(totalRecipients, minRespondentsPercent)
}

export function toAnonymousSurveyResponseDate(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
