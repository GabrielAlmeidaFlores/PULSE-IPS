import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigsByTenantPaginated,
  findHealthSurveyConfigById,
  createNewHealthSurveyConfigEntry,
  updateExistingHealthSurveyConfigEntry,
  deactivateHealthSurveyConfigEntry,
  type HealthSurveyConfigListingFilters,
} from "@/modules/health-surveys/health-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import { buildPaginationParams } from "@/libs/utils/pagination"
import type { CreateHealthSurveyConfigInput, UpdateHealthSurveyConfigInput, ScoreDirection } from "@/modules/health-surveys/health-survey.types"
import { AppError } from "@/libs/errors/app-error"
export type { HealthSurveyConfigWithDetails, HealthSurveyConfigListingFilters } from "@/modules/health-surveys/health-survey.repository"

export function getHealthSurveyConfigs(tenantId: string): ReturnType<typeof findHealthSurveyConfigsByTenant> {
  return findHealthSurveyConfigsByTenant(tenantId)
}

export interface HealthSurveyConfigListingQuery {
  page: number
  pageSize: number
  q?: string
  frequency?: string
  departmentId?: string
}

export function getHealthSurveyConfigsPaginated(
  tenantId: string,
  query: HealthSurveyConfigListingQuery,
): Promise<{ items: Awaited<ReturnType<typeof findHealthSurveyConfigsByTenant>>; total: number }> {
  const { page, pageSize } = buildPaginationParams(query.page, query.pageSize)
  const skip = (page - 1) * pageSize
  const filters: HealthSurveyConfigListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  if (query.frequency !== undefined) filters.frequency = query.frequency
  if (query.departmentId !== undefined) filters.departmentId = query.departmentId
  return findHealthSurveyConfigsByTenantPaginated(tenantId, filters, skip, pageSize)
}

export function getHealthSurveyConfigsWithDepartments(
  tenantId: string,
  filters: HealthSurveyConfigListingFilters,
): Promise<{ items: Awaited<ReturnType<typeof findHealthSurveyConfigsByTenant>>; total: number }> {
  return findHealthSurveyConfigsByTenantPaginated(tenantId, filters, 0, 1000)
}

export function getHealthSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findHealthSurveyConfigById> {
  return findHealthSurveyConfigById(tenantId, configId)
}

export interface CreateHealthSurveyForDepartmentsInput {
  departmentIds: string[] | "all"
  excludeDeptIds?: string[]
  name: string
  description?: string
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

export async function createHealthSurveyForDepartments(tenantId: string, input: CreateHealthSurveyForDepartmentsInput): Promise<void> {
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

  const configInput: CreateHealthSurveyConfigInput = {
    departmentIds: targetDeptIds,
    name: input.name,
    description: input.description,
    frequency: input.frequency,
    scheduledDayOfMonth: input.scheduledDayOfMonth,
    dispatchTime: input.dispatchTime,
    workDays: input.workDays,
    questions: input.questions,
  }

  await createNewHealthSurveyConfigEntry(tenantId, configInput)
}

export async function updateHealthSurveyConfig(tenantId: string, configId: string, input: UpdateHealthSurveyConfigInput): Promise<void> {
  await updateExistingHealthSurveyConfigEntry(tenantId, configId, input)
}

export async function deactivateHealthSurveyConfig(tenantId: string, configId: string): Promise<void> {
  await deactivateHealthSurveyConfigEntry(tenantId, configId)
}
