import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigById,
  findFirstHealthSurveyConfigByTenant,
  upsertHealthSurveyConfig,
} from "@/modules/health-surveys/health-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import type { CreateHealthSurveyConfigInput, GlobalHealthSurveyConfigInput, ExistingGlobalHealthSurveyConfig, ScoreDirection } from "@/modules/health-surveys/health-survey.types"

export function getHealthSurveyConfigs(tenantId: string): ReturnType<typeof findHealthSurveyConfigsByTenant> {
  return findHealthSurveyConfigsByTenant(tenantId)
}

export function getHealthSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findHealthSurveyConfigById> {
  return findHealthSurveyConfigById(tenantId, configId)
}

export function configureHealthSurvey(tenantId: string, input: CreateHealthSurveyConfigInput): ReturnType<typeof upsertHealthSurveyConfig> {
  return upsertHealthSurveyConfig(tenantId, input)
}

export async function getGlobalHealthSurveyConfig(tenantId: string): Promise<ExistingGlobalHealthSurveyConfig | null> {
  const config = await findFirstHealthSurveyConfigByTenant(tenantId)
  if (!config) return null
  return {
    frequency: config.frequency as GlobalHealthSurveyConfigInput["frequency"],
    workStartTime: config.workStartTime,
    workEndTime: config.workEndTime,
    workDays: config.workDays.map((w) => w.dayOfWeek),
    questions: config.questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      scoreDirection: q.scoreDirection as ScoreDirection,
    })),
  }
}

export async function configureHealthSurveyForAllDepartments(tenantId: string, input: GlobalHealthSurveyConfigInput): Promise<void> {
  const departments = await findActiveDepartmentsByTenant(tenantId)
  for (const dept of departments) {
    await upsertHealthSurveyConfig(tenantId, { ...input, departmentId: dept.id })
  }
}
