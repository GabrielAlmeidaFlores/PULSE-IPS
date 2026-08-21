import { env } from "@/env"
import { createLogger } from "@/libs/utils/logger"
import { getMessageQueue, getEmailQueue } from "@/libs/queue"
import { getDayOfWeekInTimezone, isAtWorkStartWindow } from "@/libs/utils/date"
import {
  findAllTenantsTokensEligibleForReminderCheck,
  findClimateSurveyTokensEligibleForManualReminder,
  markClimateSurveyTokensReminderSent,
  type ReminderEligibleToken,
} from "@/modules/climate-surveys/climate-survey.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { recordClimateSurveyReminderDispatched } from "@/modules/climate-surveys/climate-survey-analytics.service"

const logger = createLogger("climate-survey-response-reminder")

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

function buildSurveyUrl(token: ReminderEligibleToken): string {
  return `${env.NEXT_PUBLIC_APP_URL}/climate-survey/${token.orgSlug}/${token.shortCode}`
}

async function enqueueClimateSurveyReminderMessages(tokens: ReminderEligibleToken[]): Promise<number> {
  if (tokens.length === 0) return 0

  const tokenIds = tokens.map((t) => t.id)
  await markClimateSurveyTokensReminderSent(tokenIds)

  const messageJobs = tokens
    .filter((token) => token.sendViaMessaging)
    .map((token) => ({
      name: "send-message" as const,
      data: {
        recipientPhone: token.employeePhone,
        recipientName: token.employeeName,
        orgName: token.orgName,
        surveyLink: buildSurveyUrl(token),
        tenantId: token.tenantId,
        employeeId: token.employeeId,
        provider: env.MESSAGING_PROVIDER,
        type: "climate_survey_reminder" as const,
        dispatchId: token.dispatchId,
      },
    }))

  const emailJobs = tokens
    .filter((token) => token.sendViaSignedLink && token.employeeEmail !== null && token.employeeEmail.trim() !== "")
    .map((token) => {
      const email = token.employeeEmail
      if (email === null) return null
      return {
        name: "send-email" as const,
        data: {
          recipientEmail: email,
          recipientName: token.employeeName,
          orgName: token.orgName,
          surveyLink: buildSurveyUrl(token),
          tenantId: token.tenantId,
          employeeId: token.employeeId,
          provider: env.EMAIL_PROVIDER,
          type: "climate_survey_reminder" as const,
          tokenExpiryHours: token.tokenExpiryHours,
          dispatchId: token.dispatchId,
        },
      }
    })
    .filter((job): job is NonNullable<typeof job> => job !== null)

  if (messageJobs.length > 0) {
    await getMessageQueue().addBulk(messageJobs)
  }
  if (emailJobs.length > 0) {
    await getEmailQueue().addBulk(emailJobs)
  }

  return messageJobs.length + emailJobs.length
}

async function recordRemindersByDispatch(tokens: ReminderEligibleToken[], sentCount: number): Promise<void> {
  if (sentCount <= 0) return
  const byDispatch = new Map<string, { tenantId: string; count: number }>()
  for (const token of tokens) {
    const viaMessaging = token.sendViaMessaging
    const viaEmail =
      token.sendViaSignedLink && token.employeeEmail !== null && token.employeeEmail.trim() !== ""
    if (!viaMessaging && !viaEmail) continue
    const quantity = (viaMessaging ? 1 : 0) + (viaEmail ? 1 : 0)
    const existing = byDispatch.get(token.dispatchId)
    if (existing !== undefined) {
      existing.count += quantity
      continue
    }
    byDispatch.set(token.dispatchId, { tenantId: token.tenantId, count: quantity })
  }
  for (const [dispatchId, entry] of byDispatch) {
    await recordClimateSurveyReminderDispatched(entry.tenantId, dispatchId, entry.count)
  }
}

export async function runClimateSurveyResponseReminder(): Promise<void> {
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
    const tokensToRemind = tenantTokens
      .map((token) => ({
        ...token,
        sendViaMessaging: token.sendViaMessaging && hasMessaging,
      }))
      .filter((token) => {
        const viaMessaging = token.sendViaMessaging
        const viaEmail =
          token.sendViaSignedLink && token.employeeEmail !== null && token.employeeEmail.trim() !== ""
        return viaMessaging || viaEmail
      })

    if (tokensToRemind.length === 0) {
      logger.info(`Tenant ${tenantId} sem canais elegíveis para lembrete`)
      continue
    }

    const sentCount = await enqueueClimateSurveyReminderMessages(tokensToRemind)
    await recordRemindersByDispatch(tokensToRemind, sentCount)
    logger.info(`Lembrete enfileirado para ${sentCount.toString()} envios no tenant ${tenantId}`)
  }
}

export async function sendClimateSurveyRemindersForDispatch(tenantId: string, dispatchId: string): Promise<number> {
  const tokens = await findClimateSurveyTokensEligibleForManualReminder(tenantId, dispatchId)
  if (tokens.length === 0) return 0

  const hasMessaging = await hasTenantPlanFeature(tenantId, "messaging")
  const tokensToRemind = tokens
    .map((token) => ({
      ...token,
      sendViaMessaging: token.sendViaMessaging && hasMessaging,
    }))
    .filter((token) => {
      const viaMessaging = token.sendViaMessaging
      const viaEmail =
        token.sendViaSignedLink && token.employeeEmail !== null && token.employeeEmail.trim() !== ""
      return viaMessaging || viaEmail
    })

  if (tokensToRemind.length === 0) return 0

  const sentCount = await enqueueClimateSurveyReminderMessages(tokensToRemind)
  await recordRemindersByDispatch(tokensToRemind, sentCount)
  logger.info(`Lembrete manual enfileirado para ${sentCount.toString()} envios no dispatch ${dispatchId}`)
  return sentCount
}
