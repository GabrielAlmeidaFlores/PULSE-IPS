import { describe, it, expect, vi } from "vitest"
import {
  canRevealSurveyGroupResults,
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

  it("normaliza createdAt de resposta para data UTC sem horário", () => {
    const stamped = toAnonymousSurveyResponseDate(new Date("2026-08-11T18:42:17.345Z"))
    expect(stamped.toISOString()).toBe("2026-08-11T00:00:00.000Z")
  })
})
