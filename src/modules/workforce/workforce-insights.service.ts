import { AppError } from "@/libs/errors/app-error"
import { getAIService } from "@/libs/integrations"
import type { AIToolDefinition } from "@/libs/integrations/ai/ai.interface"
import { createLogger } from "@/libs/utils/logger"
import { CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT } from "@/modules/climate-surveys/climate-survey.types"
import {
  getLatestClimateSurveyDepartmentScores,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import {
  findWorkforceInsights,
  replaceWorkforceInsights,
} from "@/modules/workforce/workforce-insight.repository"
import { workforceInsightToolSchema } from "@/modules/workforce/workforce-insights.schema"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import type {
  CreateWorkforceInsightInput,
  WorkforceCrossAnalysis,
  WorkforceCrossAnalysisRow,
  WorkforceInsight,
  WorkforceRiskLevel,
} from "@/modules/workforce/workforce.types"

const logger = createLogger("workforce-insights")

const WORKFORCE_HIGH_ABSENTEEISM_PERCENT = 8

const WORKFORCE_INSIGHTS_SYSTEM_PROMPT = [
  "Você é um analista de RH da plataforma Pulse.",
  "Receberá um cruzamento de indicadores por setor: headcount, absenteísmo %, turnover % e score de clima (%).",
  "Gere insights acionáveis chamando a ferramenta save_workforce_insight:",
  "- kind root_cause: hipóteses de causa raiz para setores com absenteísmo alto e/ou clima baixo.",
  "- kind burnout_risk: setores com risco de burnout (absenteísmo alto combinado com clima baixo).",
  "- kind action_suggestion: sugestões de plano de ação concretas para o RH.",
  "Regras:",
  "- Seja específico e cite o setor quando aplicável.",
  "- severity: high | medium | low.",
  "- Não invente dados; baseie-se apenas no cruzamento fornecido.",
  "- Gere de 3 a 8 insights.",
].join("\n")

const SAVE_WORKFORCE_INSIGHT_TOOL: AIToolDefinition = {
  name: "save_workforce_insight",
  description: "Salva um insight acionável gerado a partir do cruzamento de indicadores.",
  parameters: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: ["root_cause", "burnout_risk", "action_suggestion"],
        description: "Tipo do insight: causa raiz, risco de burnout ou sugestão de ação.",
      },
      severity: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Gravidade do insight.",
      },
      departmentName: {
        type: "string",
        description: "Setor relacionado ao insight. Ex.: 'Área Técnica'. Omita se for geral.",
      },
      title: { type: "string", description: "Título curto e objetivo. Ex.: 'Absenteísmo alto na Área Técnica'." },
      description: {
        type: "string",
        description: "Explicação e recomendação acionável. Ex.: 'Absenteísmo de 12% combinado a clima de 55%; investigar carga de trabalho e liderança.'",
      },
    },
    required: ["kind", "severity", "title", "description"],
  },
}

function parseJsonArguments(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function normalizeDepartmentName(name: string): string {
  return name.trim().toLowerCase()
}

function resolveRiskLevel(absenteeismPercent: number | null, climateScorePercent: number | null): WorkforceRiskLevel {
  const highAbsenteeism =
    absenteeismPercent !== null && absenteeismPercent >= WORKFORCE_HIGH_ABSENTEEISM_PERCENT
  const lowClimate =
    climateScorePercent !== null && climateScorePercent < CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT
  if (highAbsenteeism && lowClimate) return "high"
  if (highAbsenteeism || lowClimate) return "medium"
  return "low"
}

export async function getWorkforceCrossAnalysis(
  tenantId: string,
  competencia?: string,
): Promise<WorkforceCrossAnalysis> {
  const [workforce, climate] = await Promise.all([
    getWorkforceDashboard(tenantId, competencia),
    getLatestClimateSurveyDepartmentScores(tenantId),
  ])

  const climateWaveId = climate.waveId
  const climateByDepartment = new Map<
    string,
    { scorePercent: number | null; favorabilityPercent: number | null; enps: number | null }
  >()
  for (const department of climate.departments) {
    climateByDepartment.set(normalizeDepartmentName(department.departmentName), {
      scorePercent: department.weightedScorePercent,
      favorabilityPercent: department.favorabilityPercent,
      enps: department.enps,
    })
  }

  const rows: WorkforceCrossAnalysisRow[] = workforce.departments.map((department) => {
    const climate = climateByDepartment.get(normalizeDepartmentName(department.departmentName))
    const climateScorePercent = climate?.scorePercent ?? null
    return {
      departmentName: department.departmentName,
      headcount: department.headcount,
      absenteeismPercent: department.absenteeismPercent,
      turnoverPercent: department.turnoverPercent,
      climateScorePercent,
      climateFavorabilityPercent: climate?.favorabilityPercent ?? null,
      climateEnps: climate?.enps ?? null,
      riskLevel: resolveRiskLevel(department.absenteeismPercent, climateScorePercent),
    }
  })

  return { competencias: workforce.competencias, competencia: workforce.selectedCompetencia, climateWaveId, rows }
}

export interface WorkforceInsightsResult {
  analysis: WorkforceCrossAnalysis
  insights: WorkforceInsight[]
}

export async function getWorkforceInsights(
  tenantId: string,
  competencia?: string,
): Promise<WorkforceInsightsResult> {
  const analysis = await getWorkforceCrossAnalysis(tenantId, competencia)
  if (analysis.competencia === null) {
    return { analysis, insights: [] }
  }
  const insights = await findWorkforceInsights(tenantId, analysis.competencia)
  return { analysis, insights }
}

export async function generateWorkforceInsightsWithAI(
  tenantId: string,
  competencia?: string,
): Promise<WorkforceInsightsResult> {
  const analysis = await getWorkforceCrossAnalysis(tenantId, competencia)
  if (analysis.competencia === null || analysis.rows.length === 0) {
    throw new AppError("WORKFORCE_NO_DATA", "Não há dados suficientes para gerar a análise.")
  }

  const ai = getAIService()
  const result = await ai.generate({
    system: WORKFORCE_INSIGHTS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ competencia: analysis.competencia, departments: analysis.rows }),
      },
    ],
    tools: [SAVE_WORKFORCE_INSIGHT_TOOL],
    tier: "high",
  })

  const insights: CreateWorkforceInsightInput[] = []
  for (const call of result.toolCalls) {
    if (call.name !== SAVE_WORKFORCE_INSIGHT_TOOL.name) continue
    const parsed = workforceInsightToolSchema.safeParse(parseJsonArguments(call.arguments))
    if (!parsed.success) {
      logger.warn(`insight inválido ignorado na competência ${analysis.competencia}`)
      continue
    }
    insights.push({
      kind: parsed.data.kind,
      severity: parsed.data.severity,
      title: parsed.data.title,
      description: parsed.data.description,
      ...(parsed.data.departmentName !== undefined ? { departmentName: parsed.data.departmentName } : {}),
    })
  }

  await replaceWorkforceInsights(tenantId, analysis.competencia, insights)

  return { analysis, insights: await findWorkforceInsights(tenantId, analysis.competencia) }
}
