import {
  createClimateSurveyActionSuggestions,
  findClimateSurveyActionSuggestionById,
  findClimateSurveyActionSuggestionDimensions,
  findPendingClimateSurveyActionSuggestions,
  markClimateSurveyActionSuggestionAccepted,
  markClimateSurveyActionSuggestionRejected,
  type ClimateSurveyActionSuggestionFields,
  type ClimateSurveyActionSuggestionRow,
  type CreateClimateSurveyActionSuggestionInput,
} from "@/modules/climate-surveys/climate-survey-action-suggestion.repository"
import {
  CLIMATE_SURVEY_ACTION_PLAYBOOKS,
  CLIMATE_SURVEY_DEFAULT_ACTION_PLAYBOOK,
} from "@/modules/climate-surveys/climate-survey-action-suggestion.playbooks"
import {
  getClimateSurveyDispatchDashboard,
  getClimateSurveyDispatchHeatmap,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { createClimateSurveyActionPlan } from "@/modules/climate-surveys/climate-survey-action-plan.service"
import {
  CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  resolveClimateSurveyTopicLabel,
  toClimateSurveyDimension,
  type ClimateSurveyModuleDashboard,
} from "@/modules/climate-surveys/climate-survey.types"
import { getClimateSurveyTopicLabelMap } from "@/modules/climate-surveys/climate-survey-topic.service"
import { findAllTenantsClimateSurveyDispatchesForSuggestion } from "@/modules/climate-surveys/climate-survey.repository"
import { AppError } from "@/libs/errors/app-error"

export interface ClimateSurveyActionSuggestion extends ClimateSurveyActionSuggestionRow {
  dimensionLabel: string
}

export interface AcceptClimateSurveyActionSuggestionInput {
  what: string
  why: string
  who: string
  where: string
  when: string
  how: string
  cost?: string
  dueDate?: Date
  assigneeId?: string
}

function resolveWhere(
  heatmap: ClimateSurveyModuleDashboard["heatmap"] | null,
  dimension: string,
  goalPercent: number,
): string {
  if (heatmap === null) return "Toda a empresa"
  const belowGoal = heatmap.cells
    .filter(
      (cell) =>
        cell.dimension === dimension && cell.favorabilityPercent !== null && cell.favorabilityPercent < goalPercent,
    )
    .sort((a, b) => (a.favorabilityPercent ?? 0) - (b.favorabilityPercent ?? 0))
  const names = belowGoal
    .map((cell) => heatmap.departments.find((department) => department.id === cell.departmentId)?.name)
    .filter((name): name is string => name !== undefined)
  if (names.length === 0) return "Toda a empresa"
  return names.slice(0, 3).join(", ")
}

export async function generateClimateSurveyActionSuggestions(
  tenantId: string,
  dispatchId: string,
): Promise<number> {
  const [dashboard, heatmap] = await Promise.all([
    getClimateSurveyDispatchDashboard(tenantId, dispatchId),
    getClimateSurveyDispatchHeatmap(tenantId, dispatchId),
  ])
  if (dashboard === null) return 0

  const existingDimensions = new Set(await findClimateSurveyActionSuggestionDimensions(tenantId, dispatchId))
  const goalPercent = CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT
  const inputs: CreateClimateSurveyActionSuggestionInput[] = []

  for (const topic of dashboard.dimensionScores) {
    const value = topic.favorabilityPercent
    if (value === null || value >= goalPercent || existingDimensions.has(topic.dimension)) continue
    const playbook = CLIMATE_SURVEY_ACTION_PLAYBOOKS[topic.dimension] ?? CLIMATE_SURVEY_DEFAULT_ACTION_PLAYBOOK
    const gap = Math.round((goalPercent - value) * 10) / 10
    const gapLabel = gap === 1 ? "1 ponto" : `${gap} pontos`
    inputs.push({
      dispatchId,
      dimension: topic.dimension,
      what: playbook.what,
      why: `${topic.label} fechou em ${Math.round(value)}%, ${gapLabel} abaixo da meta de ${goalPercent}%`,
      who: playbook.who,
      where: resolveWhere(heatmap, topic.dimension, goalPercent),
      when: playbook.when,
      how: playbook.how,
    })
  }

  if (inputs.length === 0) return 0
  await createClimateSurveyActionSuggestions(tenantId, inputs)
  return inputs.length
}

export async function runClimateSurveyActionSuggestionGenerator(): Promise<{
  closedWaves: number
  createdSuggestions: number
}> {
  const dispatches = await findAllTenantsClimateSurveyDispatchesForSuggestion()
  const now = Date.now()
  let closedWaves = 0
  let createdSuggestions = 0
  for (const dispatch of dispatches) {
    const windowEndsAt = dispatch.dispatchedAt.getTime() + dispatch.tokenExpiryHours * 3_600_000
    if (windowEndsAt > now) continue
    closedWaves += 1
    createdSuggestions += await generateClimateSurveyActionSuggestions(dispatch.tenantId, dispatch.id)
  }
  return { closedWaves, createdSuggestions }
}

export async function getPendingClimateSurveyActionSuggestions(
  tenantId: string,
): Promise<ClimateSurveyActionSuggestion[]> {
  const [rows, topicLabelMap] = await Promise.all([
    findPendingClimateSurveyActionSuggestions(tenantId),
    getClimateSurveyTopicLabelMap(tenantId),
  ])
  return rows.map((row) => ({
    ...row,
    dimensionLabel: resolveClimateSurveyTopicLabel(toClimateSurveyDimension(row.dimension), topicLabelMap),
  }))
}

function buildDescription(input: AcceptClimateSurveyActionSuggestionInput): string {
  const cost = input.cost !== undefined && input.cost.trim() !== "" ? input.cost.trim() : "a definir"
  return [
    `Por quê: ${input.why}`,
    `Quem: ${input.who}`,
    `Onde: ${input.where}`,
    `Quando: ${input.when}`,
    `Como: ${input.how}`,
    `Quanto: ${cost}`,
  ].join("\n")
}

export async function acceptClimateSurveyActionSuggestion(
  tenantId: string,
  suggestionId: string,
  input: AcceptClimateSurveyActionSuggestionInput,
  actorId?: string,
): Promise<void> {
  const suggestion = await findClimateSurveyActionSuggestionById(tenantId, suggestionId)
  if (suggestion === null) {
    throw new AppError("CLIMATE_SUGGESTION_NOT_FOUND", "Sugestão não encontrada.")
  }
  if (suggestion.status !== "pending") {
    throw new AppError("CLIMATE_SUGGESTION_NOT_PENDING", "Esta sugestão já foi tratada.")
  }

  const plan = await createClimateSurveyActionPlan(
    tenantId,
    {
      title: input.what,
      description: buildDescription(input),
      priority: "medium",
      dimension: toClimateSurveyDimension(suggestion.dimension),
      climateSurveyDispatchId: suggestion.dispatchId,
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
    },
    actorId,
  )

  const fields: ClimateSurveyActionSuggestionFields = {
    what: input.what,
    why: input.why,
    who: input.who,
    where: input.where,
    when: input.when,
    how: input.how,
    cost: input.cost !== undefined && input.cost.trim() !== "" ? input.cost.trim() : null,
  }
  await markClimateSurveyActionSuggestionAccepted(tenantId, suggestionId, plan.id, fields)
}

export async function rejectClimateSurveyActionSuggestion(
  tenantId: string,
  suggestionId: string,
  reason: string,
): Promise<void> {
  const trimmedReason = reason.trim()
  if (trimmedReason === "") {
    throw new AppError("CLIMATE_SUGGESTION_REASON_REQUIRED", "Informe o motivo da recusa.")
  }
  const suggestion = await findClimateSurveyActionSuggestionById(tenantId, suggestionId)
  if (suggestion === null) {
    throw new AppError("CLIMATE_SUGGESTION_NOT_FOUND", "Sugestão não encontrada.")
  }
  if (suggestion.status !== "pending") {
    throw new AppError("CLIMATE_SUGGESTION_NOT_PENDING", "Esta sugestão já foi tratada.")
  }
  await markClimateSurveyActionSuggestionRejected(tenantId, suggestionId, trimmedReason)
}
