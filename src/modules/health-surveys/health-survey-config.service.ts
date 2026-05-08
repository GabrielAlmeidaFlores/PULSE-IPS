import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigsByTenantPaginated,
  findHealthSurveyConfigById,
  findHealthSurveyConfigsByName,
  createManyHealthSurveyConfigEntries,
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

export interface HealthSurveyConfigGroup {
  id: string
  name: string
  description: string | null
  frequency: string
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  questionCount: number
  departments: { id: string; name: string }[]
  configIds: string[]
}

export async function getHealthSurveyConfigsGrouped(
  tenantId: string,
  filters: HealthSurveyConfigListingFilters,
): Promise<{ groups: HealthSurveyConfigGroup[]; total: number }> {
  const allConfigs = await findHealthSurveyConfigsByTenantPaginated(tenantId, filters, 0, 1000)
  const groupMap = new Map<string, HealthSurveyConfigGroup>()

  for (const config of allConfigs.items) {
    const existing = groupMap.get(config.name)
    if (existing !== undefined) {
      existing.configIds.push(config.id)
      if (config.department.isActive) {
        existing.departments.push({ id: config.department.id, name: config.department.name })
      }
    } else {
      groupMap.set(config.name, {
        id: config.id,
        name: config.name,
        description: config.description,
        frequency: config.frequency,
        scheduledDayOfMonth: config.scheduledDayOfMonth,
        dispatchTime: config.dispatchTime,
        workDays: config.workDays.map((w) => w.dayOfWeek),
        questionCount: config.questions.length,
        departments: config.department.isActive ? [{ id: config.department.id, name: config.department.name }] : [],
        configIds: [config.id],
      })
    }
  }

  const groups = Array.from(groupMap.values())
  return { groups, total: groups.length }
}

export async function getHealthSurveyConfigGroup(
  tenantId: string,
  configId: string,
): Promise<{ representative: NonNullable<Awaited<ReturnType<typeof findHealthSurveyConfigById>>>; allDeptIds: string[] } | null> {
  const config = await findHealthSurveyConfigById(tenantId, configId)
  if (!config) return null

  const siblings = await findHealthSurveyConfigsByName(tenantId, config.name)
  const allDeptIds = siblings.map((c) => c.departmentId)
  return { representative: config, allDeptIds }
}

export function getHealthSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findHealthSurveyConfigById> {
  return findHealthSurveyConfigById(tenantId, configId)
}

export function getHealthSurveyConfigGroupByName(tenantId: string, name: string): Promise<Awaited<ReturnType<typeof findHealthSurveyConfigsByName>>> {
  return findHealthSurveyConfigsByName(tenantId, name)
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

  const configInput: Omit<CreateHealthSurveyConfigInput, "departmentId"> = {
    name: input.name,
    description: input.description,
    frequency: input.frequency,
    scheduledDayOfMonth: input.scheduledDayOfMonth,
    dispatchTime: input.dispatchTime,
    workDays: input.workDays,
    questions: input.questions,
  }

  await createManyHealthSurveyConfigEntries(tenantId, targetDeptIds.map((deptId) => ({ ...configInput, departmentId: deptId })))
}

export async function updateHealthSurveyConfig(tenantId: string, configId: string, input: UpdateHealthSurveyConfigInput): Promise<void> {
  await updateExistingHealthSurveyConfigEntry(tenantId, configId, input)
}

export async function deactivateHealthSurveyConfig(tenantId: string, configId: string): Promise<void> {
  await deactivateHealthSurveyConfigEntry(tenantId, configId)
}
