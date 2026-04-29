import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigById,
  upsertHealthSurveyConfig,
} from "@/modules/health-surveys/health-survey.repository"
import type { CreateHealthSurveyConfigInput } from "@/modules/health-surveys/health-survey.types"

export function getHealthSurveyConfigs(tenantId: string): ReturnType<typeof findHealthSurveyConfigsByTenant> {
  return findHealthSurveyConfigsByTenant(tenantId)
}

export function getHealthSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findHealthSurveyConfigById> {
  return findHealthSurveyConfigById(tenantId, configId)
}

export function configureHealthSurvey(tenantId: string, input: CreateHealthSurveyConfigInput): ReturnType<typeof upsertHealthSurveyConfig> {
  return upsertHealthSurveyConfig(tenantId, input)
}
