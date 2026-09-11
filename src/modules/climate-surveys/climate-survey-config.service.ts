import {
  findClimateSurveyConfigsByTenant,
  findClimateSurveyConfigsByTenantPaginated,
  findClimateSurveyConfigById,
  createNewClimateSurveyConfigEntry,
  updateExistingClimateSurveyConfigEntry,
  deactivateClimateSurveyConfigEntry,
  type ClimateSurveyConfigListingFilters,
} from "@/modules/climate-surveys/climate-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import { buildPaginationParams } from "@/libs/utils/pagination"
import type {
  CreateClimateSurveyConfigInput,
  UpdateClimateSurveyConfigInput,
  ClimateSurveyQuestionInput,
  ClimateSurveyFrequency,
  ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"
import { AppError } from "@/libs/errors/app-error"
import { assertClimateSurveyTopicKeysExist } from "@/modules/climate-surveys/climate-survey-topic.service"
import {
  recordClimateSurveyCreated,
  recordClimateSurveyQuestionsSelected,
} from "@/modules/climate-surveys/climate-survey-analytics.service"
export type { ClimateSurveyConfigWithDetails, ClimateSurveyConfigListingFilters } from "@/modules/climate-surveys/climate-survey.repository"

export function getClimateSurveyConfigs(tenantId: string): ReturnType<typeof findClimateSurveyConfigsByTenant> {
  return findClimateSurveyConfigsByTenant(tenantId)
}

export interface ClimateSurveyConfigListingQuery {
  page: number
  pageSize: number
  q?: string
  frequency?: string
  departmentId?: string
}

export function getClimateSurveyConfigsPaginated(
  tenantId: string,
  query: ClimateSurveyConfigListingQuery,
): Promise<{ items: Awaited<ReturnType<typeof findClimateSurveyConfigsByTenant>>; total: number }> {
  const { page, pageSize } = buildPaginationParams(query.page, query.pageSize)
  const skip = (page - 1) * pageSize
  const filters: ClimateSurveyConfigListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  if (query.frequency !== undefined) filters.frequency = query.frequency
  if (query.departmentId !== undefined) filters.departmentId = query.departmentId
  return findClimateSurveyConfigsByTenantPaginated(tenantId, filters, skip, pageSize)
}

export function getClimateSurveyConfigsWithDepartments(
  tenantId: string,
  filters: ClimateSurveyConfigListingFilters,
): Promise<{ items: Awaited<ReturnType<typeof findClimateSurveyConfigsByTenant>>; total: number }> {
  return findClimateSurveyConfigsByTenantPaginated(tenantId, filters, 0, 1000)
}

export function getClimateSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findClimateSurveyConfigById> {
  return findClimateSurveyConfigById(tenantId, configId)
}

export async function duplicateClimateSurveyConfig(tenantId: string, configId: string): Promise<string> {
  const source = await findClimateSurveyConfigById(tenantId, configId)
  if (source === null) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")

  const departmentIds = source.configDepartments.map((configDepartment) => configDepartment.department.id)
  if (departmentIds.length === 0) {
    throw new AppError("NO_DEPARTMENTS", "A configuração não possui setores para duplicar.")
  }

  const questions: ClimateSurveyQuestionInput[] = source.questions.map((question) => ({
    text: question.text,
    order: question.order,
    scoreDirection: question.scoreDirection as ScoreDirection,
    dimension: question.dimension,
  }))

  const configInput: CreateClimateSurveyConfigInput = {
    departmentIds,
    name: `Cópia de ${source.name}`,
    description: source.description ?? undefined,
    frequency: source.frequency as ClimateSurveyFrequency,
    scheduledDayOfMonth: source.scheduledDayOfMonth,
    dispatchTime: source.dispatchTime,
    workDays: source.workDays.map((workDay) => workDay.dayOfWeek),
    respectEmployeeSchedule: source.respectEmployeeSchedule,
    tokenExpiryHours: source.tokenExpiryHours,
    sendViaMessaging: source.sendViaMessaging,
    sendViaSignedLink: source.sendViaSignedLink,
    questions,
  }

  const created = await createNewClimateSurveyConfigEntry(tenantId, configInput)
  await recordClimateSurveyCreated(tenantId, created.id)
  await recordClimateSurveyQuestionsSelected(
    tenantId,
    created.id,
    created.questions.map((question) => ({ id: question.id, order: question.order })),
  )
  return created.id
}

export interface CreateClimateSurveyForDepartmentsInput {
  departmentIds: string[] | "all"
  excludeDeptIds?: string[]
  name: string
  description?: string
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly" | "once" | "quarterly" | "semiannual"
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  respectEmployeeSchedule: boolean
  tokenExpiryHours: number
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  questions: ClimateSurveyQuestionInput[]
}

export async function createClimateSurveyForDepartments(tenantId: string, input: CreateClimateSurveyForDepartmentsInput): Promise<void> {
  let targetDeptIds: string[]

  if (input.departmentIds === "all") {
    const departments = await findActiveDepartmentsByTenant(tenantId)
    targetDeptIds = departments.map((d) => d.id)
  } else {
    targetDeptIds = input.departmentIds
  }

  if (input.excludeDeptIds !== undefined && input.excludeDeptIds.length > 0) {
    const excludeSet = new Set(input.excludeDeptIds)
    targetDeptIds = targetDeptIds.filter((id) => !excludeSet.has(id))
  }

  if (targetDeptIds.length === 0) {
    throw new AppError("NO_DEPARTMENTS", "Selecione ao menos um setor.")
  }

  if (!input.sendViaMessaging && !input.sendViaSignedLink) {
    throw new AppError("NO_CHANNELS", "Selecione ao menos um canal de envio.")
  }

  await assertClimateSurveyTopicKeysExist(
    tenantId,
    input.questions.map((question) => question.dimension),
  )

  const configInput: CreateClimateSurveyConfigInput = {
    departmentIds: targetDeptIds,
    name: input.name,
    description: input.description,
    frequency: input.frequency,
    scheduledDayOfMonth: input.scheduledDayOfMonth,
    dispatchTime: input.dispatchTime,
    workDays: input.workDays,
    respectEmployeeSchedule: input.respectEmployeeSchedule,
    tokenExpiryHours: input.tokenExpiryHours,
    sendViaMessaging: input.sendViaMessaging,
    sendViaSignedLink: input.sendViaSignedLink,
    questions: input.questions,
  }

  const created = await createNewClimateSurveyConfigEntry(tenantId, configInput)
  await recordClimateSurveyCreated(tenantId, created.id)
  await recordClimateSurveyQuestionsSelected(
    tenantId,
    created.id,
    created.questions.map((question) => ({ id: question.id, order: question.order })),
  )
}

export async function updateClimateSurveyConfig(tenantId: string, configId: string, input: UpdateClimateSurveyConfigInput): Promise<void> {
  if (!input.sendViaMessaging && !input.sendViaSignedLink) {
    throw new AppError("NO_CHANNELS", "Selecione ao menos um canal de envio.")
  }
  await assertClimateSurveyTopicKeysExist(
    tenantId,
    input.questions.map((question) => question.dimension),
  )
  const updated = await updateExistingClimateSurveyConfigEntry(tenantId, configId, input)
  const activeQuestions = updated.questions.filter((question) => question.isActive)
  await recordClimateSurveyQuestionsSelected(
    tenantId,
    configId,
    activeQuestions.map((question) => ({ id: question.id, order: question.order })),
  )
}

export async function deactivateClimateSurveyConfig(tenantId: string, configId: string): Promise<void> {
  await deactivateClimateSurveyConfigEntry(tenantId, configId)
}
