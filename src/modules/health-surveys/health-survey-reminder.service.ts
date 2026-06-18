import { env } from "@/env"
import { createLogger } from "@/libs/utils/logger"
import { getMessageQueue } from "@/libs/queue"
import { getDayOfWeekInTimezone, isAtWorkStartWindow } from "@/libs/utils/date"
import {
  findAllTenantsTokensEligibleForReminderCheck,
  markHealthSurveyTokensReminderSent,
  type ReminderEligibleToken,
} from "@/modules/health-surveys/health-survey.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"

const logger = createLogger("health-survey-response-reminder")

function isEligibleByTiming(token: ReminderEligibleToken, now: Date): boolean {
  const expiresAtMs = token.expiresAt.getTime()
  const windowMs = token.tokenExpiryHours * 60 * 60 * 1000
  const halfwayMs = expiresAtMs - windowMs / 2
  return now.getTime() >= halfwayMs && now.getTime() < expiresAtMs
}

function isEligibleBySchedule(token: ReminderEligibleToken): boolean {
  if (!token.respectEmployeeSchedule) return true
  const todayDow = getDayOfWeekInTimezone(token.orgTimezone)
  if (!token.workDays.includes(todayDow)) return false
  return isAtWorkStartWindow(token.orgTimezone, token.workStartTime)
}

export async function runHealthSurveyResponseReminder(): Promise<void> {
  const tokens = await findAllTenantsTokensEligibleForReminderCheck()
  logger.info(`Tokens elegíveis para verificação de lembrete: ${tokens.length.toString()}`)

  const now = new Date()
  const timingEligible = tokens.filter((t) => isEligibleByTiming(t, now))
  logger.info(`Tokens na janela de timing: ${timingEligible.length.toString()}`)

  const scheduleEligible = timingEligible.filter((t) => isEligibleBySchedule(t))
  logger.info(`Tokens após filtro de jornada: ${scheduleEligible.length.toString()}`)

  if (scheduleEligible.length === 0) return

  const byTenant = new Map<string, ReminderEligibleToken[]>()
  for (const token of scheduleEligible) {
    const existing = byTenant.get(token.tenantId)
    if (existing !== undefined) {
      existing.push(token)
    } else {
      byTenant.set(token.tenantId, [token])
    }
  }

  for (const [tenantId, tenantTokens] of byTenant) {
    const hasMessaging = await hasTenantPlanFeature(tenantId, "messaging")
    if (!hasMessaging) {
      logger.info(`Tenant ${tenantId} sem feature messaging — lembrete ignorado`)
      continue
    }

    const tokenIds = tenantTokens.map((t) => t.id)
    await markHealthSurveyTokensReminderSent(tokenIds)

    const messageQueue = getMessageQueue()
    const bulkJobs = tenantTokens.map((token) => {
      const surveyUrl = `${env.NEXT_PUBLIC_APP_URL}/health-survey/${token.orgSlug}/${token.shortCode}`
      return {
        name: "send-message" as const,
        data: {
          recipientPhone: token.employeePhone,
          recipientName: token.employeeName,
          surveyLink: surveyUrl,
          tenantId: token.tenantId,
          employeeId: token.employeeId,
          provider: env.MESSAGING_PROVIDER,
          type: "health_survey_reminder" as const,
        },
      }
    })

    await messageQueue.addBulk(bulkJobs)
    logger.info(`Lembrete enfileirado para ${bulkJobs.length.toString()} colaboradores no tenant ${tenantId}`)
  }
}
