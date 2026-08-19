import { AppError } from "@/libs/errors/app-error"
import { canRevealSurveyGroupResults, MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"

export { canRevealSurveyGroupResults, MINIMUM_RESPONDENTS_FOR_DISPLAY }

export function assertClimateSurveyIdentifiableExportForbidden(): never {
  throw new AppError(
    "CLIMATE_SURVEY_IDENTIFIABLE_EXPORT_FORBIDDEN",
    "Exportação de respostas identificáveis de pesquisa de clima é proibida.",
  )
}

export function maskClimateSurveyResponseCount(respondentCount: number): number | null {
  return canRevealSurveyGroupResults(respondentCount) ? respondentCount : null
}
