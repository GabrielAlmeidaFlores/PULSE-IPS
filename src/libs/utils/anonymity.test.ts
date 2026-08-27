import { describe, it, expect, vi } from "vitest"
import {
  canRevealClimateSurveyGroupResults,
  canRevealSurveyGroupResults,
  climateSurveyRequiredRespondents,
  CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR,
  MINIMUM_RESPONDENTS_FOR_DISPLAY,
  toAnonymousSurveyResponseDate,
} from "@/libs/utils/anonymity"

vi.mock("@/env", () => ({
  env: {
    HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY: 5,
  },
}))

describe("anonymity utils", () => {
  it("expõe o limiar mínimo de respondentes para exibição", () => {
    expect(MINIMUM_RESPONDENTS_FOR_DISPLAY).toBe(5)
  })

  it("só libera resultados de grupo a partir do limiar", () => {
    expect(canRevealSurveyGroupResults(0)).toBe(false)
    expect(canRevealSurveyGroupResults(4)).toBe(false)
    expect(canRevealSurveyGroupResults(5)).toBe(true)
    expect(canRevealSurveyGroupResults(12)).toBe(true)
  })

  it("calcula o mínimo de respondentes por percentual com piso de segurança", () => {
    expect(CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR).toBe(3)
    expect(climateSurveyRequiredRespondents(100, 40)).toBe(40)
    expect(climateSurveyRequiredRespondents(10, 40)).toBe(4)
    expect(climateSurveyRequiredRespondents(5, 40)).toBe(3)
    expect(climateSurveyRequiredRespondents(3, 40)).toBe(3)
    expect(climateSurveyRequiredRespondents(0, 40)).toBe(Number.POSITIVE_INFINITY)
  })

  it("revela resultados de clima apenas quando atinge percentual e piso", () => {
    expect(canRevealClimateSurveyGroupResults(39, 100, 40)).toBe(false)
    expect(canRevealClimateSurveyGroupResults(40, 100, 40)).toBe(true)
    expect(canRevealClimateSurveyGroupResults(2, 5, 40)).toBe(false)
    expect(canRevealClimateSurveyGroupResults(3, 5, 40)).toBe(true)
    expect(canRevealClimateSurveyGroupResults(3, 0, 40)).toBe(false)
  })

  it("normaliza createdAt de resposta para data UTC sem horário", () => {
    const stamped = toAnonymousSurveyResponseDate(new Date("2026-08-11T18:42:17.345Z"))
    expect(stamped.toISOString()).toBe("2026-08-11T00:00:00.000Z")
  })
})
