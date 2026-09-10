import { AppError } from "@/libs/errors/app-error"
import { getAIService } from "@/libs/integrations"
import type { AIToolDefinition } from "@/libs/integrations/ai/ai.interface"
import { createLogger } from "@/libs/utils/logger"
import { createPlanWithTasks } from "@/modules/action-plans/action-plan.service"
import type { ActionPlan } from "@/modules/action-plans/action-plan.types"
import { CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT } from "@/modules/climate-surveys/climate-survey.types"
import {
  getLatestClimateSurveyDepartmentScores,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import {
  findWorkforceInsightById,
  findWorkforceInsights,
  linkWorkforceInsightToActionPlan,
  replaceWorkforceInsights,
} from "@/modules/workforce/workforce-insight.repository"
import {
  workforceActionPlanToolSchema,
  workforceInsightToolSchema,
} from "@/modules/workforce/workforce-insights.schema"
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

const WORKFORCE_ACTION_PLAN_SYSTEM_PROMPT = [
  "Você é um especialista em RH da plataforma Pulse.",
  "Receberá um insight de equipe (cruzamento de absenteísmo/turnover com clima) e os indicadores dos setores relacionados.",
  "Gere UM plano de ação acionável chamando a ferramenta save_workforce_action_plan.",
  "Regras:",
  "- O plano deve responder diretamente ao insight e ter resultado mensurável.",
  "- A descrição deve trazer contexto, objetivo e resultado esperado.",
  "- Gere de 3 a 6 tarefas concretas e atribuíveis.",
  "- A prioridade deve ser coerente com a severidade do insight.",
  "- Não invente dados; baseie-se apenas no insight e nos indicadores fornecidos.",
].join("\n")

const SAVE_WORKFORCE_ACTION_PLAN_TOOL: AIToolDefinition = {
  name: "save_workforce_action_plan",
  description: "Cria um plano de ação de RH a partir de um insight de equipe.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título curto e objetivo do plano. Ex.: 'Reduzir absenteísmo em Operações'." },
      description: {
        type: "string",
        description: "Descrição com contexto, objetivo e resultado esperado. Ex.: 'Absenteísmo de 12% e clima de 55%; investigar carga de trabalho e liderança e reduzir em 3 p.p. em 90 dias.'",
      },
      priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridade do plano." },
      tasks: {
        type: "array",
        description: "Tarefas concretas do plano (1 a 10).",
        items: {
          type: "object",
          properties: { title: { type: "string", description: "Título da tarefa. Ex.: 'Entrevistar liderança de Operações'." } },
          required: ["title"],
        },
      },
    },
    required: ["title", "description", "priority", "tasks"],
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

export async function generateActionPlanFromWorkforceInsight(
  tenantId: string,
  insightId: string,
  actorId?: string,
): Promise<ActionPlan> {
  const insight = await findWorkforceInsightById(tenantId, insightId)
  if (insight === null) {
    throw new AppError("WORKFORCE_INSIGHT_NOT_FOUND", "Insight não encontrado.")
  }

  const analysis = await getWorkforceCrossAnalysis(tenantId, insight.competencia)
  const relatedDepartments =
    insight.departmentName !== null
      ? analysis.rows.filter((row) => row.departmentName === insight.departmentName)
      : analysis.rows

  const ai = getAIService()
  const result = await ai.generate({
    system: WORKFORCE_ACTION_PLAN_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          competencia: analysis.competencia,
          insight: {
            kind: insight.kind,
            severity: insight.severity,
            departmentName: insight.departmentName,
            title: insight.title,
            description: insight.description,
          },
          departments: relatedDepartments,
        }),
      },
    ],
    tools: [SAVE_WORKFORCE_ACTION_PLAN_TOOL],
    tier: "high",
  })

  const toolCall = result.toolCalls.find((call) => call.name === SAVE_WORKFORCE_ACTION_PLAN_TOOL.name)
  if (toolCall === undefined) {
    throw new AppError("WORKFORCE_ACTION_PLAN_GENERATION_FAILED", "Não foi possível gerar o plano de ação. Tente novamente.")
  }

  const parsed = workforceActionPlanToolSchema.safeParse(parseJsonArguments(toolCall.arguments))
  if (!parsed.success) {
    logger.warn("plano de ação inválido gerado pela IA")
    throw new AppError("WORKFORCE_ACTION_PLAN_GENERATION_FAILED", "Não foi possível gerar o plano de ação. Tente novamente.")
  }

  const plan = await createPlanWithTasks(
    tenantId,
    {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
    },
    parsed.data.tasks.map((task) => task.title),
    actorId,
  )
  await linkWorkforceInsightToActionPlan(tenantId, insightId, plan.id)
  return plan
}
