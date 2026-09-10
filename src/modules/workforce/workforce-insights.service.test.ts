import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  generateWorkforceInsightsWithAI,
  getWorkforceCrossAnalysis,
  getWorkforceInsights,
} from "@/modules/workforce/workforce-insights.service"
import {
  findWorkforceInsights,
  replaceWorkforceInsights,
} from "@/modules/workforce/workforce-insight.repository"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import {
  getLatestClimateSurveyDepartmentScores,
  type LatestClimateSurveyDepartmentScores,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import type { IAIService } from "@/libs/integrations/ai/ai.interface"
import type { WorkforceDashboard, WorkforceInsight } from "@/modules/workforce/workforce.types"

vi.mock("@/modules/workforce/workforce-insight.repository")
vi.mock("@/modules/workforce/workforce.service")
vi.mock("@/modules/climate-surveys/climate-survey-dashboard.service")
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  }),
}))

const mockGenerate = vi.fn()
const MOCK_AI_SERVICE = { generate: mockGenerate } as IAIService

vi.mock("@/libs/integrations", () => ({
  getAIService: () => MOCK_AI_SERVICE,
}))

const TENANT_ID = "tenant-1"
const COMPETENCIA = "2026-08"
const OPERACOES = "Operações"
const COMERCIAL = "Comercial"

const OPERACOES_DEPARTMENT = {
  departmentName: OPERACOES,
  headcount: 6,
  admissions: 0,
  terminations: 1,
  turnoverPercent: 16.7,
  absenteeismPercent: 12,
}

const COMERCIAL_DEPARTMENT = {
  departmentName: COMERCIAL,
  headcount: 4,
  admissions: 1,
  terminations: 0,
  turnoverPercent: 0,
  absenteeismPercent: 2,
}

const WORKFORCE_DASHBOARD: WorkforceDashboard = {
  competencias: [COMPETENCIA],
  selectedCompetencia: COMPETENCIA,
  kpis: {
    headcount: 10,
    admissions: 1,
    terminations: 1,
    turnoverPercent: 10,
    absenteeismPercent: 6,
    expectedHours: 1760,
    absentHours: 100,
  },
  departments: [OPERACOES_DEPARTMENT, COMERCIAL_DEPARTMENT],
  evolution: [],
}

const LATEST_CLIMATE_SCORES: LatestClimateSurveyDepartmentScores = {
  waveId: "wave-1",
  departments: [
    {
      departmentId: "dept-1",
      departmentName: OPERACOES,
      favorabilityPercent: 40,
      weightedScorePercent: 55,
      enps: -20,
      answerCount: 20,
      respondentCount: 20,
    },
  ],
}

const SAVED_INSIGHT: WorkforceInsight = {
  id: "insight-1",
  tenantId: TENANT_ID,
  competencia: COMPETENCIA,
  kind: "burnout_risk",
  severity: "high",
  departmentName: OPERACOES,
  title: "Risco de burnout em Operações",
  description: "Absenteísmo alto combinado a clima baixo.",
  createdAt: new Date("2026-09-10T00:00:00Z"),
}

const mockGetWorkforceDashboard = vi.mocked(getWorkforceDashboard)
const mockGetLatestClimateSurveyDepartmentScores = vi.mocked(getLatestClimateSurveyDepartmentScores)
const mockFindWorkforceInsights = vi.mocked(findWorkforceInsights)
const mockReplaceWorkforceInsights = vi.mocked(replaceWorkforceInsights)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetWorkforceDashboard.mockResolvedValue(WORKFORCE_DASHBOARD)
  mockGetLatestClimateSurveyDepartmentScores.mockResolvedValue(LATEST_CLIMATE_SCORES)
  mockFindWorkforceInsights.mockResolvedValue([SAVED_INSIGHT])
  mockReplaceWorkforceInsights.mockResolvedValue(undefined)
  mockGenerate.mockResolvedValue({ text: null, toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } })
})

describe("getWorkforceCrossAnalysis", () => {
  it("cruza setores por nome e classifica risco alto quando absenteísmo e clima são ruins", async () => {
    const analysis = await getWorkforceCrossAnalysis(TENANT_ID, COMPETENCIA)

    expect(analysis.competencia).toBe(COMPETENCIA)
    expect(analysis.climateWaveId).toBe("wave-1")
    expect(analysis.rows).toHaveLength(2)

    const operacoes = analysis.rows.find((row) => row.departmentName === OPERACOES)
    expect(operacoes).toMatchObject({
      headcount: 6,
      absenteeismPercent: 12,
      climateScorePercent: 55,
      climateFavorabilityPercent: 40,
      climateEnps: -20,
      riskLevel: "high",
    })

    const comercial = analysis.rows.find((row) => row.departmentName === COMERCIAL)
    expect(comercial).toMatchObject({
      absenteeismPercent: 2,
      climateScorePercent: null,
      riskLevel: "low",
    })
  })

  it("classifica risco médio quando apenas o absenteísmo está alto", async () => {
    mockGetLatestClimateSurveyDepartmentScores.mockResolvedValue({ waveId: null, departments: [] })

    const analysis = await getWorkforceCrossAnalysis(TENANT_ID, COMPETENCIA)

    expect(analysis.climateWaveId).toBeNull()
    const operacoes = analysis.rows.find((row) => row.departmentName === OPERACOES)
    expect(operacoes?.riskLevel).toBe("medium")
  })

  it("classifica risco médio quando apenas o clima está baixo", async () => {
    const workforce: WorkforceDashboard = {
      ...WORKFORCE_DASHBOARD,
      departments: [{ ...OPERACOES_DEPARTMENT, absenteeismPercent: 1 }],
    }
    mockGetWorkforceDashboard.mockResolvedValue(workforce)

    const analysis = await getWorkforceCrossAnalysis(TENANT_ID, COMPETENCIA)

    expect(analysis.rows[0]?.riskLevel).toBe("medium")
  })
})

describe("getWorkforceInsights", () => {
  it("retorna insights vazios quando não há competência selecionada", async () => {
    mockGetWorkforceDashboard.mockResolvedValue({ ...WORKFORCE_DASHBOARD, selectedCompetencia: null })

    const result = await getWorkforceInsights(TENANT_ID)

    expect(result.insights).toEqual([])
    expect(mockFindWorkforceInsights).not.toHaveBeenCalled()
  })

  it("busca os insights persistidos da competência selecionada", async () => {
    const result = await getWorkforceInsights(TENANT_ID, COMPETENCIA)

    expect(result.insights).toEqual([SAVED_INSIGHT])
    expect(mockFindWorkforceInsights).toHaveBeenCalledWith(TENANT_ID, COMPETENCIA)
  })
})

describe("generateWorkforceInsightsWithAI", () => {
  it("lança AppError quando não há dados importados", async () => {
    mockGetWorkforceDashboard.mockResolvedValue({ ...WORKFORCE_DASHBOARD, selectedCompetencia: null })

    await expect(generateWorkforceInsightsWithAI(TENANT_ID)).rejects.toMatchObject({ code: "WORKFORCE_NO_DATA" })
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it("chama a IA no tier high e persiste os insights válidos", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "save_workforce_insight",
          arguments: JSON.stringify({
            kind: "burnout_risk",
            severity: "high",
            departmentName: OPERACOES,
            title: "Risco de burnout",
            description: "Absenteísmo alto e clima baixo.",
          }),
        },
      ],
      usage: { inputTokens: 10, outputTokens: 20 },
    })

    const result = await generateWorkforceInsightsWithAI(TENANT_ID, COMPETENCIA)

    expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ tier: "high" }))
    expect(mockReplaceWorkforceInsights).toHaveBeenCalledWith(TENANT_ID, COMPETENCIA, [
      {
        kind: "burnout_risk",
        severity: "high",
        departmentName: OPERACOES,
        title: "Risco de burnout",
        description: "Absenteísmo alto e clima baixo.",
      },
    ])
    expect(result.insights).toEqual([SAVED_INSIGHT])
  })

  it("ignora tool calls inválidas ou desconhecidas", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        { id: "call-1", name: "outra_tool", arguments: "{}" },
        { id: "call-2", name: "save_workforce_insight", arguments: "não é json" },
        {
          id: "call-3",
          name: "save_workforce_insight",
          arguments: JSON.stringify({ kind: "invalido", severity: "high", title: "x", description: "y" }),
        },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await generateWorkforceInsightsWithAI(TENANT_ID, COMPETENCIA)

    expect(mockReplaceWorkforceInsights).toHaveBeenCalledWith(TENANT_ID, COMPETENCIA, [])
  })

  it("persiste insight sem setor quando o campo é omitido", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "save_workforce_insight",
          arguments: JSON.stringify({
            kind: "action_suggestion",
            severity: "medium",
            title: "Revisar carga de trabalho",
            description: "Priorizar setores com absenteísmo alto.",
          }),
        },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await generateWorkforceInsightsWithAI(TENANT_ID, COMPETENCIA)

    expect(mockReplaceWorkforceInsights).toHaveBeenCalledWith(TENANT_ID, COMPETENCIA, [
      {
        kind: "action_suggestion",
        severity: "medium",
        title: "Revisar carga de trabalho",
        description: "Priorizar setores com absenteísmo alto.",
      },
    ])
  })
})
