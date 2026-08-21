import { randomUUID } from "crypto"
import { env } from "@/env"
import { AppError } from "@/libs/errors/app-error"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import {
  countActiveEmployeesGroupedByDepartment,
  createClimateSurveyDispatch,
  findClimateSurveyConfigById,
  findClimateSurveyConfigsByTenant,
  updateClimateSurveyConfigCampaignSettings,
} from "@/modules/climate-surveys/climate-survey.repository"
import type {
  ClimateSurveyCampaignSetup,
  LaunchClimateSurveyCampaignInput,
} from "@/modules/climate-surveys/climate-survey.types"

export async function getClimateSurveyCampaignSetup(tenantId: string): Promise<ClimateSurveyCampaignSetup> {
  const [configs, departments, hasMessagingFeature] = await Promise.all([
    findClimateSurveyConfigsByTenant(tenantId),
    findActiveDepartmentsByTenant(tenantId),
    hasTenantPlanFeature(tenantId, "messaging"),
  ])

  const departmentIds = departments.map((d) => d.id)
  const employeeCounts = await countActiveEmployeesGroupedByDepartment(tenantId, departmentIds)

  return {
    configs: configs.map((config) => ({
      id: config.id,
      name: config.name,
      frequency: config.frequency,
      sendViaMessaging: config.sendViaMessaging,
      sendViaSignedLink: config.sendViaSignedLink,
      tokenExpiryHours: config.tokenExpiryHours,
      departmentIds: config.configDepartments.map((cd) => cd.department.id),
    })),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
      employeeCount: employeeCounts.get(department.id) ?? 0,
    })),
    messageTemplate: env.SURVEY_MESSAGE_TEMPLATE,
    hasMessagingFeature,
  }
}

export async function launchClimateSurveyCampaign(
  tenantId: string,
  input: LaunchClimateSurveyCampaignInput,
): Promise<{ dispatchId: string }> {
  if (!input.sendViaMessaging && !input.sendViaSignedLink) {
    throw new AppError("NO_CHANNELS", "Selecione ao menos um canal de envio.")
  }
  if (input.departmentIds.length === 0) {
    throw new AppError("NO_DEPARTMENTS", "Inclua ao menos um departamento na campanha.")
  }

  const config = await findClimateSurveyConfigById(tenantId, input.configId)
  if (!config) throw new AppError("CONFIG_NOT_FOUND", "Pesquisa não encontrada.")

  if (input.sendViaMessaging) {
    const hasMessaging = await hasTenantPlanFeature(tenantId, "messaging")
    if (!hasMessaging) {
      throw new AppError("MESSAGING_FEATURE_REQUIRED", "Seu plano não inclui envio de mensagens.")
    }
  }

  const tokenExpiryHours = input.timingMode === "reminder_48h" ? Math.max(config.tokenExpiryHours, 96) : config.tokenExpiryHours

  await updateClimateSurveyConfigCampaignSettings(tenantId, input.configId, {
    frequency: input.frequency,
    sendViaMessaging: input.sendViaMessaging,
    sendViaSignedLink: input.sendViaSignedLink,
    tokenExpiryHours,
    departmentIds: input.departmentIds,
  })

  const signedLinkToken = input.sendViaSignedLink ? randomUUID() : undefined
  const dispatch = await createClimateSurveyDispatch(
    tenantId,
    input.configId,
    input.scheduledAt,
    "manual",
    signedLinkToken,
  )

  return { dispatchId: dispatch.id }
}
