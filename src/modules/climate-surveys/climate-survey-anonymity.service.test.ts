import { describe, it, expect, vi } from "vitest"
import {
  assertClimateSurveyIdentifiableExportForbidden,
  canRevealSurveyGroupResults,
  maskClimateSurveyResponseCount,
  MINIMUM_RESPONDENTS_FOR_DISPLAY,
} from "@/modules/climate-surveys/climate-survey-anonymity.service"
import { AppError } from "@/libs/errors/app-error"

vi.mock("@/env", () => ({
  env: {
    HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY: 5,
  },
}))

describe("climate-survey-anonymity.service", () => {
  it("usa o limiar mínimo configurado para revelar resultados de grupo", () => {
    expect(MINIMUM_RESPONDENTS_FOR_DISPLAY).toBe(5)
    expect(canRevealSurveyGroupResults(4)).toBe(false)
    expect(canRevealSurveyGroupResults(5)).toBe(true)
  })

  it("mascara contagem de respostas abaixo do limiar de anonimato", () => {
    expect(maskClimateSurveyResponseCount(3)).toBeNull()
    expect(maskClimateSurveyResponseCount(5)).toBe(5)
  })

  it("proíbe exportação identificável de respostas de clima", () => {
    expect(() => assertClimateSurveyIdentifiableExportForbidden()).toThrow(AppError)
    try {
      assertClimateSurveyIdentifiableExportForbidden()
    } catch (error) {
      expect(error).toMatchObject({ code: "CLIMATE_SURVEY_IDENTIFIABLE_EXPORT_FORBIDDEN" })
    }
  })
})
