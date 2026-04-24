import {
  findSurveyConfigsByTenant,
  findSurveyConfigById,
  upsertSurveyConfig,
} from "@/modules/surveys/survey.repository"
import type { CreateSurveyConfigInput } from "@/modules/surveys/survey.types"

export function getSurveyConfigs(tenantId: string): ReturnType<typeof findSurveyConfigsByTenant> {
  return findSurveyConfigsByTenant(tenantId)
}

export function getSurveyConfig(tenantId: string, configId: string): ReturnType<typeof findSurveyConfigById> {
  return findSurveyConfigById(tenantId, configId)
}

export function configureSurvey(tenantId: string, input: CreateSurveyConfigInput): ReturnType<typeof upsertSurveyConfig> {
  return upsertSurveyConfig(tenantId, input)
}
