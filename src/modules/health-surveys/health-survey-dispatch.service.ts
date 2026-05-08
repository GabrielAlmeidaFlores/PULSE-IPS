import { randomUUID } from "crypto"
import { addHours } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { getMessageQueue } from "@/libs/queue"
import { env } from "@/env"
import { createLogger } from "@/libs/utils/logger"
import {
  findAllTenantsPendingHealthSurveyDispatches,
  findAllTenantsActiveHealthSurveyConfigsForAutoDispatch,
  createHealthSurveyTokens,
  markHealthSurveyDispatchDispatched,
  createHealthSurveyDispatch,
  findAllTenantsHealthSurveyDispatches48hAgo,
  countHealthSurveyResponsesForDispatch,
  createHealthSurveyAdherenceAlert,
  markHealthSurveyDispatchAdherenceChecked,
  findExistingTokensForDispatch,
  type HealthSurveyDispatchEmployee,
} from "@/modules/health-surveys/health-survey.repository"
import { hasOpenAlertOfType } from "@/modules/alerts/alert.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { findEmployeeIdsEligibleForDispatch } from "@/modules/consent/consent.repository"

const logger = createLogger("health-survey-dispatcher")

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  twice_weekly: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 28,
}

function buildMessageFromTemplate(template: string, employeeName: string, surveyUrl: string): string {
  return template.replace("{nome}", employeeName).replace("{link}", surveyUrl)
}

function getDayOfWeekInTimezone(timezone: string): number {
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(new Date())
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return dayMap[dayName] ?? 0
}

function getDayOfMonthInTimezone(timezone: string): number {
  return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: timezone, day: "numeric" }).format(new Date()), 10)
}

function isWorkDay(workDays: number[], timezone: string): boolean {
  const today = getDayOfWeekInTimezone(timezone)
  return workDays.includes(today)
}

function isScheduledDayOfMonth(scheduledDay: number, timezone: string): boolean {
  return getDayOfMonthInTimezone(timezone) === scheduledDay
}

interface SchedulingCheckConfig {
  frequency: string
  scheduledDayOfMonth: number | null
  workDays: number[]
  lastDispatchedAt: Date | null
}

function shouldSkipDispatch(config: SchedulingCheckConfig, timezone: string): boolean {
  if (config.frequency === "monthly" && config.scheduledDayOfMonth !== null) {
    if (!isScheduledDayOfMonth(config.scheduledDayOfMonth, timezone)) return true
    if (config.lastDispatchedAt !== null) {
      const daysSinceLast = (Date.now() - config.lastDispatchedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLast < 25) return true
    }
    return false
  }
  if (!isWorkDay(config.workDays, timezone)) return true
  const intervalDays = FREQUENCY_INTERVAL_DAYS[config.frequency] ?? 7
  if (config.lastDispatchedAt !== null) {
    const daysSinceLast = (Date.now() - config.lastDispatchedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLast < intervalDays) return true
  }
  return false
}

function isAtDispatchTime(dispatchTime: string, timezone: string): boolean {
  const nowInTimezone = toZonedTime(new Date(), timezone)
  const currentMinutes = nowInTimezone.getHours() * 60 + nowInTimezone.getMinutes()
  const [h, m] = dispatchTime.split(":").map(Number)
  const targetMinutes = (h ?? 0) * 60 + (m ?? 0)
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 15
}

async function sendDispatchTokensAndMessages(
  dispatchId: string,
  tenantId: string,
  eligibleEmployees: HealthSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string },
): Promise<void> {
  const allEmployeeIds = eligibleEmployees.map((e) => e.id)
  const eligibleForDispatchIds = new Set(await findEmployeeIdsEligibleForDispatch(tenantId, allEmployeeIds))
  const dispatchTargetEmployees = eligibleEmployees.filter((e) => eligibleForDispatchIds.has(e.id))

  const existingTokens = await findExistingTokensForDispatch(
    tenantId,
    dispatchId,
    dispatchTargetEmployees.map((e) => e.id),
  )
  const respondedEmployeeIds = new Set(existingTokens.filter((t) => t.usedAt !== null).map((t) => t.employeeId))
  const now = new Date()
  const existingUnusedTokenMap = new Map(
    existingTokens.filter((t) => t.usedAt === null && t.expiresAt > now).map((t) => [t.employeeId, t.token]),
  )

  const toSendEmployees = dispatchTargetEmployees.filter((e) => !respondedEmployeeIds.has(e.id))

  const newTokenInputs = toSendEmployees
    .filter((e) => !existingUnusedTokenMap.has(e.id))
    .map((emp) => ({
      tenantId,
      dispatchId,
      employeeId: emp.id,
      token: randomUUID(),
      expiresAt: addHours(new Date(), 48),
      workStartTime: emp.workStartTime ?? department.workStartTime,
      workEndTime: emp.workEndTime ?? department.workEndTime,
    }))

  const newTokenMap = new Map(newTokenInputs.map((t) => [t.employeeId, t.token]))

  if (newTokenInputs.length > 0) {
    await createHealthSurveyTokens(newTokenInputs)
  }

  const hasMessaging = await hasTenantPlanFeature(tenantId, "messaging")
  if (hasMessaging) {
    const messageQueue = getMessageQueue()
    const bulkJobs = toSendEmployees
      .map((emp) => {
        const tokenValue = existingUnusedTokenMap.get(emp.id) ?? newTokenMap.get(emp.id)
        if (!tokenValue) return null
        const healthSurveyUrl = `${env.NEXT_PUBLIC_APP_URL}/health-survey/${tokenValue}`
        return {
          name: "send-message" as const,
          data: {
            to: emp.phone,
            body: buildMessageFromTemplate(env.SURVEY_MESSAGE_TEMPLATE, emp.name, healthSurveyUrl),
            tenantId,
            employeeId: emp.id,
            provider: env.MESSAGING_PROVIDER,
            type: "survey_dispatch" as const,
            templateName: env.WHATSAPP_SURVEY_TEMPLATE_NAME,
            templateVariables: [emp.name, healthSurveyUrl],
          },
        }
      })
      .filter((job): job is NonNullable<typeof job> => job !== null)

    if (bulkJobs.length > 0) {
      await messageQueue.addBulk(bulkJobs)
    }
  }

  await markHealthSurveyDispatchDispatched(tenantId, dispatchId, dispatchTargetEmployees.length)
}

async function fireDispatch(
  configId: string,
  tenantId: string,
  employees: HealthSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string; workDays: number[] },
  timezone: string,
): Promise<boolean> {
  const today = getDayOfWeekInTimezone(timezone)

  const workDayFiltered = employees.filter((emp) => {
    const effectiveDays = emp.workDays.length > 0 ? emp.workDays : department.workDays
    return effectiveDays.includes(today)
  })

  if (workDayFiltered.length === 0) return false

  const dispatch = await createHealthSurveyDispatch(tenantId, configId, new Date(), randomUUID())

  await sendDispatchTokensAndMessages(
    dispatch.id,
    tenantId,
    workDayFiltered,
    department,
  )

  return true
}

export async function runHealthSurveyDispatcher(): Promise<{ dispatched: number; errors: number }> {
  const pendingDispatches = await findAllTenantsPendingHealthSurveyDispatches()
  let dispatched = 0
  let errors = 0

  for (const dispatch of pendingDispatches) {
    const config = dispatch.healthSurveyConfiguration
    const timezone = dispatch.organization.timezone

    try {
      const dept = config.department
      const deptWorkDays = dept.workDays.map((w) => w.dayOfWeek)
      const today = getDayOfWeekInTimezone(timezone)

      const workDayFiltered = dept.employees.filter((emp) => {
        const effectiveDays = emp.workDays.map((w) => w.dayOfWeek)
        const activeDays = effectiveDays.length > 0 ? effectiveDays : deptWorkDays
        return activeDays.includes(today)
      })

      if (workDayFiltered.length === 0) {
        await markHealthSurveyDispatchDispatched(dispatch.tenantId, dispatch.id, 0)
        dispatched++
        continue
      }

      const eligibleEmployees: HealthSurveyDispatchEmployee[] = workDayFiltered
        .map((emp) => ({
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          workStartTime: emp.workStartTime,
          workEndTime: emp.workEndTime,
          workDays: emp.workDays.map((w) => w.dayOfWeek),
        }))

      if (eligibleEmployees.length === 0) {
        await markHealthSurveyDispatchDispatched(dispatch.tenantId, dispatch.id, 0)
        dispatched++
        continue
      }

      await sendDispatchTokensAndMessages(
        dispatch.id,
        dispatch.tenantId,
        eligibleEmployees,
        { workStartTime: dept.workStartTime, workEndTime: dept.workEndTime },
      )

      dispatched++
    } catch (err) {
      errors++
      logger.error("health-survey-dispatcher: error processing dispatch", { err, dispatchId: dispatch.id })
    }
  }

  return { dispatched, errors }
}

export async function runHealthSurveyAutoDispatchScheduler(): Promise<{ triggered: number; skipped: number }> {
  const configs = await findAllTenantsActiveHealthSurveyConfigsForAutoDispatch()
  let triggered = 0
  let skipped = 0

  for (const config of configs) {
    try {
      const timezone = config.organization.timezone

      if (!isAtDispatchTime(config.dispatchTime, timezone)) {
        skipped++
        continue
      }

      if (shouldSkipDispatch(config, timezone)) {
        skipped++
        continue
      }

      const fired = await fireDispatch(
        config.id,
        config.tenantId,
        config.department.employees,
        config.department,
        timezone,
      )
      if (fired) triggered++
    } catch (err) {
      skipped++
      logger.error("auto-dispatcher: error triggering dispatch", { err, configId: config.id })
    }
  }

  return { triggered, skipped }
}

export async function checkHealthSurveyDispatchAdherence(): Promise<{ processed: number; alertsCreated: number }> {
  const ALERT_ADHERENCE_THRESHOLD = 0.8
  const dispatches = await findAllTenantsHealthSurveyDispatches48hAgo()
  let alertsCreated = 0

  for (const dispatch of dispatches) {
    try {
      if (dispatch.totalRecipients === 0) {
        await markHealthSurveyDispatchAdherenceChecked(dispatch.tenantId, dispatch.id, 0)
        continue
      }

      const responseCount = await countHealthSurveyResponsesForDispatch(dispatch.tenantId, dispatch.id)
      const adherenceRate = Math.min(1.0, responseCount / dispatch.totalRecipients)

      if (adherenceRate < ALERT_ADHERENCE_THRESHOLD) {
        const departmentId = dispatch.healthSurveyConfiguration.departmentId
        const alreadyOpenNoResponse = await hasOpenAlertOfType(dispatch.tenantId, "no_response", departmentId)
        const alreadyOpenLowAdherence = await hasOpenAlertOfType(dispatch.tenantId, "low_adherence", departmentId)
        if (!alreadyOpenNoResponse && !alreadyOpenLowAdherence) {
          await createHealthSurveyAdherenceAlert({
            tenantId: dispatch.tenantId,
            departmentId,
            adherenceRate,
            responseCount,
            totalRecipients: dispatch.totalRecipients,
          })
          alertsCreated++
        }
      }

      await markHealthSurveyDispatchAdherenceChecked(dispatch.tenantId, dispatch.id, responseCount)
    } catch (err) {
      logger.error("adherence-checker: error processing dispatch", { err, dispatchId: dispatch.id, tenantId: dispatch.tenantId })
    }
  }

  return { processed: dispatches.length, alertsCreated }
}
