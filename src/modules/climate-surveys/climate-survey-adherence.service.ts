import {
  findClimateSurveyAdherenceDispatch,
  findClimateSurveyTokenChannelStats,
  findClimateSurveyTokensEligibleForManualReminder,
  type ClimateSurveyTokenChannelStatRow,
} from "@/modules/climate-surveys/climate-survey.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import {
  CLIMATE_SURVEY_ADHERENCE_CHANNEL_LABELS,
  CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT,
  resolveClimateSurveyAdherenceStatusLabel,
  type ClimateSurveyAdherenceChannelComparison,
  type ClimateSurveyAdherenceChannelKey,
  type ClimateSurveyAdherenceDepartmentRow,
  type ClimateSurveyAdherenceOverview,
  type ClimateSurveyAdherenceReminderArea,
} from "@/modules/climate-surveys/climate-survey.types"
import { sendClimateSurveyRemindersForDispatch } from "@/modules/climate-surveys/climate-survey-reminder.service"
import { AppError } from "@/libs/errors/app-error"

function resolveEnabledChannels(sendViaMessaging: boolean, sendViaSignedLink: boolean): ClimateSurveyAdherenceChannelKey[] {
  const channels: ClimateSurveyAdherenceChannelKey[] = []
  if (sendViaMessaging) channels.push("messaging")
  if (sendViaSignedLink) channels.push("email")
  return channels
}

function computeChannelAdherence(
  tokens: ClimateSurveyTokenChannelStatRow[],
  channel: ClimateSurveyAdherenceChannelKey,
  overallRecipients: number,
  overallResponses: number,
): ClimateSurveyAdherenceChannelComparison {
  const filtered = tokens.filter((token) => {
    if (channel === "messaging") return token.shortCode !== null
    return token.shortCode === null
  })

  const useOverallFallback = channel === "email" && filtered.length === 0 && overallRecipients > 0
  const totalRecipients = useOverallFallback ? overallRecipients : filtered.length
  const totalResponses = useOverallFallback
    ? overallResponses
    : filtered.filter((token) => token.usedAt !== null).length
  const adherencePercent = totalRecipients > 0 ? Math.round((totalResponses / totalRecipients) * 100) : 0

  return {
    channel,
    label: CLIMATE_SURVEY_ADHERENCE_CHANNEL_LABELS[channel],
    totalRecipients,
    totalResponses,
    adherencePercent,
  }
}

function buildDepartmentRows(
  departments: { id: string; name: string }[],
  deptDispatches: { departmentId: string; totalRecipients: number; totalResponses: number }[],
  enabledChannels: ClimateSurveyAdherenceChannelKey[],
): ClimateSurveyAdherenceDepartmentRow[] {
  const byDeptId = new Map(deptDispatches.map((row) => [row.departmentId, row]))
  return departments
    .map((department) => {
      const totals = byDeptId.get(department.id)
      const totalEmployees = totals?.totalRecipients ?? 0
      const totalResponses = totals?.totalResponses ?? 0
      const adherencePercent = totalEmployees > 0 ? Math.round((totalResponses / totalEmployees) * 100) : 0
      return {
        departmentId: department.id,
        departmentName: department.name,
        totalEmployees,
        totalResponses,
        adherencePercent,
        channels: enabledChannels,
        statusLabel: resolveClimateSurveyAdherenceStatusLabel(adherencePercent),
      }
    })
    .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "pt-BR"))
}

function buildReminderAreas(departments: ClimateSurveyAdherenceDepartmentRow[]): ClimateSurveyAdherenceReminderArea[] {
  return departments
    .filter((row) => row.adherencePercent < CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT)
    .map((row) => ({
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      adherencePercent: row.adherencePercent,
      pendingResponses: Math.max(row.totalEmployees - row.totalResponses, 0),
    }))
    .sort((a, b) => a.adherencePercent - b.adherencePercent)
}

export async function getClimateSurveyAdherenceOverview(
  tenantId: string,
  dispatchId?: string,
): Promise<ClimateSurveyAdherenceOverview> {
  const dispatch = await findClimateSurveyAdherenceDispatch(tenantId, dispatchId)
  if (dispatch === null) {
    return {
      wave: null,
      departments: [],
      channelComparison: [],
      reminderAreas: [],
      canSendReminderNow: false,
    }
  }

  const enabledChannels = resolveEnabledChannels(dispatch.sendViaMessaging, dispatch.sendViaSignedLink)
  const departments = buildDepartmentRows(dispatch.departments, dispatch.deptDispatches, enabledChannels)
  const totalRecipients = departments.reduce((sum, row) => sum + row.totalEmployees, 0)
  const totalResponses = departments.reduce((sum, row) => sum + row.totalResponses, 0)
  const adherencePercent = totalRecipients > 0 ? Math.round((totalResponses / totalRecipients) * 100) : 0
  const tokenStats = await findClimateSurveyTokenChannelStats(tenantId, dispatch.id)
  const channelComparison = enabledChannels.map((channel) =>
    computeChannelAdherence(tokenStats, channel, totalRecipients, totalResponses),
  )
  const reminderAreas = buildReminderAreas(departments)

  const hasMessagingFeature = await hasTenantPlanFeature(tenantId, "messaging")
  const pendingReminderTokens =
    dispatch.status === "available"
      ? await findClimateSurveyTokensEligibleForManualReminder(tenantId, dispatch.id)
      : []
  const canRemindViaMessaging = dispatch.sendViaMessaging && hasMessagingFeature
  const canRemindViaEmail = dispatch.sendViaSignedLink
  const pendingForChannels = pendingReminderTokens.filter((token) => {
    if (canRemindViaMessaging) return true
    if (canRemindViaEmail) {
      return token.employeeEmail !== null && token.employeeEmail.trim() !== ""
    }
    return false
  })

  return {
    wave: {
      id: dispatch.id,
      configName: dispatch.configName,
      scheduledAt: dispatch.scheduledAt,
      dispatchedAt: dispatch.dispatchedAt,
      status: dispatch.status,
      sendViaMessaging: dispatch.sendViaMessaging,
      sendViaSignedLink: dispatch.sendViaSignedLink,
      totalRecipients,
      totalResponses,
      adherencePercent,
      pendingReminderCount: pendingForChannels.length,
    },
    departments,
    channelComparison,
    reminderAreas,
    canSendReminderNow: pendingForChannels.length > 0 && (canRemindViaMessaging || canRemindViaEmail),
  }
}

export async function triggerClimateSurveyReminderNow(
  tenantId: string,
  dispatchId: string,
): Promise<{ sentCount: number }> {
  const dispatch = await findClimateSurveyAdherenceDispatch(tenantId, dispatchId)
  if (dispatch === null) {
    throw new AppError("DISPATCH_NOT_FOUND", "Onda de pesquisa não encontrada.")
  }
  if (dispatch.status !== "available") {
    throw new AppError("DISPATCH_NOT_AVAILABLE", "A onda ainda não está disponível para lembretes.")
  }

  const hasMessagingFeature = await hasTenantPlanFeature(tenantId, "messaging")
  const canRemindViaMessaging = dispatch.sendViaMessaging && hasMessagingFeature
  const canRemindViaEmail = dispatch.sendViaSignedLink
  if (!canRemindViaMessaging && !canRemindViaEmail) {
    throw new AppError("NO_REMINDER_CHANNEL", "Nenhum canal de lembrete disponível para esta onda.")
  }

  const sentCount = await sendClimateSurveyRemindersForDispatch(tenantId, dispatchId)
  if (sentCount === 0) {
    throw new AppError("NO_PENDING_RESPONDENTS", "Não há colaboradores pendentes para lembrete nesta onda.")
  }
  return { sentCount }
}
