import { describe, it, expect } from "vitest"
import { buildClimateSurveyHeatmapCsv } from "@/modules/climate-surveys/climate-survey-export"
import type { ClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey.types"

type Heatmap = ClimateSurveyModuleDashboard["heatmap"]

function makeHeatmap(overrides: Partial<Heatmap> = {}): Heatmap {
  return {
    topics: [{ dimension: "job_satisfaction", label: "Satisfação" }],
    departments: [{ id: "dept-1", name: "Vendas" }],
    cells: [
      {
        dimension: "job_satisfaction",
        departmentId: "dept-1",
        favorabilityPercent: 80,
        band: "strong",
        responseCount: 5,
      },
    ],
    departmentTotals: [{ departmentId: "dept-1", enps: 42, scorePercent: 76 }],
    companyEnps: 50,
    companyScorePercent: 72,
    ...overrides,
  }
}

describe("buildClimateSurveyHeatmapCsv", () => {
  it("monta cabeçalho, tópicos e as linhas de eNPS e Score Total", () => {
    const lines = buildClimateSurveyHeatmapCsv(makeHeatmap()).replace("\uFEFF", "").split("\n")

    expect(lines[0]).toBe("Tópico,Vendas")
    expect(lines[1]).toBe("Satisfação,80%")
    expect(lines[2]).toBe("eNPS (empresa: +50),+42")
    expect(lines[3]).toBe("Score Total (empresa: 72%),76%")
  })

  it("usa — quando o valor é nulo", () => {
    const heatmap = makeHeatmap({
      cells: [
        {
          dimension: "job_satisfaction",
          departmentId: "dept-1",
          favorabilityPercent: null,
          band: null,
          responseCount: null,
        },
      ],
      departmentTotals: [{ departmentId: "dept-1", enps: null, scorePercent: null }],
      companyEnps: null,
      companyScorePercent: null,
    })
    const lines = buildClimateSurveyHeatmapCsv(heatmap).replace("\uFEFF", "").split("\n")

    expect(lines[1]).toBe("Satisfação,—")
    expect(lines[2]).toBe("eNPS (empresa: —),—")
    expect(lines[3]).toBe("Score Total (empresa: —),—")
  })

  it("escapa nomes de setor com vírgula e aspas", () => {
    const heatmap = makeHeatmap({ departments: [{ id: "dept-1", name: 'Vendas, "Sul"' }] })
    const lines = buildClimateSurveyHeatmapCsv(heatmap).replace("\uFEFF", "").split("\n")

    expect(lines[0]).toBe('Tópico,"Vendas, ""Sul"""')
  })
})
