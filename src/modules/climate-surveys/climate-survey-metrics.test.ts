import { describe, expect, it } from "vitest"
import {
  CLIMATE_SURVEY_LIKERT_SCALE,
  classifyClimateSurveyEnpsNote,
  climateSurveyLikertToEnpsNote,
  climateSurveyLikertWeight,
  computeClimateSurveyEnpsFromNotes,
  computeClimateSurveyFavorabilityPercent,
  computeClimateSurveyMetricsBreakdown,
  computeClimateSurveyWeightedScorePercent,
  normalizeClimateSurveyLikertScore,
} from "@/modules/climate-surveys/climate-survey-metrics"

describe("CLIMATE_SURVEY_LIKERT_SCALE", () => {
  it("expõe a escala de 5 pontos com labels e pesos oficiais", () => {
    expect(CLIMATE_SURVEY_LIKERT_SCALE).toEqual([
      { score: 5, label: "Concordo Totalmente", weight: 1.0 },
      { score: 4, label: "Concordo", weight: 0.8 },
      { score: 3, label: "Neutro", weight: 0.6 },
      { score: 2, label: "Discordo", weight: 0.4 },
      { score: 1, label: "Discordo Totalmente", weight: 0.2 },
    ])
  })
})

describe("climate-survey-metrics — pesos Likert", () => {
  it("aplica os pesos oficiais 1.0 / 0.8 / 0.6 / 0.4 / 0.2", () => {
    expect(climateSurveyLikertWeight(5)).toBe(1.0)
    expect(climateSurveyLikertWeight(4)).toBe(0.8)
    expect(climateSurveyLikertWeight(3)).toBe(0.6)
    expect(climateSurveyLikertWeight(2)).toBe(0.4)
    expect(climateSurveyLikertWeight(1)).toBe(0.2)
  })

  it("converte Likert em nota eNPS 0–10 via peso × 10", () => {
    expect(climateSurveyLikertToEnpsNote(5)).toBe(10)
    expect(climateSurveyLikertToEnpsNote(4)).toBe(8)
    expect(climateSurveyLikertToEnpsNote(3)).toBe(6)
    expect(climateSurveyLikertToEnpsNote(2)).toBe(4)
    expect(climateSurveyLikertToEnpsNote(1)).toBe(2)
  })

  it("inverte score quando direction é lower_is_better", () => {
    expect(normalizeClimateSurveyLikertScore(1, "lower_is_better")).toBe(5)
    expect(normalizeClimateSurveyLikertScore(5, "lower_is_better")).toBe(1)
  })
})

describe("climate-survey-metrics — favorabilidade", () => {
  it("calcula (Concordo + Concordo Totalmente) / total × 100", () => {
    expect(computeClimateSurveyFavorabilityPercent([5, 4, 3, 2, 1])).toBe(40)
    expect(computeClimateSurveyFavorabilityPercent([5, 5, 4, 4])).toBe(100)
    expect(computeClimateSurveyFavorabilityPercent([])).toBeNull()
  })
})

describe("climate-survey-metrics — score ponderado", () => {
  it("calcula média dos pesos Likert em percentual", () => {
    expect(computeClimateSurveyWeightedScorePercent([5, 4])).toBe(90)
    expect(computeClimateSurveyWeightedScorePercent([1, 1, 1, 1, 1])).toBe(20)
  })
})

describe("climate-survey-metrics — eNPS", () => {
  it("classifica notas 9–10 / 7–8 / 0–6", () => {
    expect(classifyClimateSurveyEnpsNote(10)).toBe("promoter")
    expect(classifyClimateSurveyEnpsNote(9)).toBe("promoter")
    expect(classifyClimateSurveyEnpsNote(8)).toBe("neutral")
    expect(classifyClimateSurveyEnpsNote(7)).toBe("neutral")
    expect(classifyClimateSurveyEnpsNote(6)).toBe("detractor")
    expect(classifyClimateSurveyEnpsNote(0)).toBe("detractor")
  })

  it("calcula % promotores − % detratores", () => {
    const breakdown = computeClimateSurveyEnpsFromNotes([10, 10, 8, 6])
    expect(breakdown.promoters).toBe(2)
    expect(breakdown.neutrals).toBe(1)
    expect(breakdown.detractors).toBe(1)
    expect(breakdown.total).toBe(4)
    expect(breakdown.score).toBe(25)
  })
})

describe("climate-survey-metrics — breakdown por escopo", () => {
  it("calcula overall, por pergunta, por tópico e por departamento", () => {
    const result = computeClimateSurveyMetricsBreakdown(
      [
        { questionId: "q-1", responseId: "r-1", departmentId: "dept-1", score: 5 },
        { questionId: "q-2", responseId: "r-1", departmentId: "dept-1", score: 5 },
        { questionId: "q-1", responseId: "r-2", departmentId: "dept-1", score: 4 },
        { questionId: "q-2", responseId: "r-2", departmentId: "dept-1", score: 4 },
        { questionId: "q-1", responseId: "r-3", departmentId: "dept-2", score: 1 },
        { questionId: "q-2", responseId: "r-3", departmentId: "dept-2", score: 1 },
      ],
      [
        { id: "q-1", scoreDirection: "higher_is_better", dimension: "job_satisfaction" },
        { id: "q-2", scoreDirection: "higher_is_better", dimension: "internal_communication" },
      ],
    )

    expect(result.overall.favorabilityPercent).toBe(67)
    expect(result.overall.weightedScorePercent).toBe(67)
    expect(result.overall.enps.total).toBe(3)
    expect(result.overall.enps.promoters).toBe(1)
    expect(result.overall.enps.neutrals).toBe(1)
    expect(result.overall.enps.detractors).toBe(1)
    expect(result.overall.enps.score).toBe(0)

    expect(result.byQuestion.get("q-1")?.favorabilityPercent).toBe(67)
    expect(result.byTopic.get("job_satisfaction")?.weightedScorePercent).toBe(67)
    expect(result.byDepartment.get("dept-1")?.favorabilityPercent).toBe(100)
    expect(result.byDepartment.get("dept-2")?.favorabilityPercent).toBe(0)
    expect(result.byDepartment.get("dept-2")?.enps.score).toBe(-100)
  })
})
