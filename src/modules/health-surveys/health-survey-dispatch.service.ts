import { randomUUID } from "crypto"
import { addHours } from "date-fns"
import { getMessageQueue } from "@/libs/queue"
import { env } from "@/env"
import { logger } from "@/libs/logger"
import {
  findAllTenantsPendingHealthSurveyDispatches,
  findAllTenantsActiveHealthSurveyConfigsForAutoDispatch,
  createHealthSurveyTokensAndMarkSent,
  createHealthSurveyDispatch,
  findAllTenantsHealthSurveyDispatches48hAgo,
  countHealthSurveyResponsesForDispatch,
  createHealthSurveyAdherenceAlert,
  markHealthSurveyDispatchAdherenceChecked,
  type HealthSurveyDispatchEmployee,
} from "@/modules/health-surveys/health-survey.repository"
import { hasOpenAlertOfType } from "@/modules/alerts/alert.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { findEmployeeIdsWithAcceptedConsent } from "@/modules/consent/consent.repository"

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

function isWorkDay(workDays: number[], timezone: string): boolean {
  const today = getDayOfWeekInTimezone(timezone)
  return workDays.includes(today)
}

async function sendDispatchTokensAndMessages(
  dispatchId: string,
  tenantId: string,
  eligibleEmployees: HealthSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string },
  configWorkStartTime: string,
  configWorkEndTime: string,
): Promise<void> {
  const allEmployeeIds = eligibleEmployees.map((e) => e.id)
  const acceptedEmployeeIds = new Set(await findEmployeeIdsWithAcceptedConsent(tenantId, allEmployeeIds))
  const consentedEmployees = eligibleEmployees.filter((e) => acceptedEmployeeIds.has(e.id))

  if (consentedEmployees.length === 0) return

  const tokens = consentedEmployees.map((emp) => ({
    tenantId,
    dispatchId,
    employeeId: emp.id,
    token: randomUUID(),
    expiresAt: addHours(new Date(), 48),
    workStartTime: emp.workStartTime ?? department.workStartTime ?? configWorkStartTime,
    workEndTime: emp.workEndTime ?? department.workEndTime ?? configWorkEndTime,
  }))

  await createHealthSurveyTokensAndMarkSent(tenantId, dispatchId, tokens)

  const hasMessaging = await hasTenantPlanFeature(tenantId, "messaging")
  if (!hasMessaging) return

  const messageQueue = getMessageQueue()
  const bulkJobs = tokens
    .map((empToken) => {
      const employee = consentedEmployees.find((e) => e.id === empToken.employeeId)
      if (!employee) return null
      const healthSurveyUrl = `${env.NEXT_PUBLIC_APP_URL}/health-survey/${empToken.token}`
      return {
        name: "send-message" as const,
        data: {
          to: employee.phone,
          body: buildMessageFromTemplate(env.SURVEY_MESSAGE_TEMPLATE, employee.name, healthSurveyUrl),
          tenantId,
          employeeId: employee.id,
          provider: env.MESSAGING_PROVIDER,
          type: "survey_dispatch" as const,
          templateName: env.WHATSAPP_SURVEY_TEMPLATE_NAME,
          templateVariables: [employee.name, healthSurveyUrl],
        },
      }
    })
    .filter((job): job is NonNullable<typeof job> => job !== null)

  await messageQueue.addBulk(bulkJobs)
}

async function fireDispatch(
  configId: string,
  tenantId: string,
  employees: HealthSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string; workDays: number[] },
  configWorkStartTime: string,
  configWorkEndTime: string,
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
    configWorkStartTime,
    configWorkEndTime,
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

    if (!isWorkDay(config.workDays.map((w) => w.dayOfWeek), timezone)) {
      continue
    }

    try {
      const dept = config.department
      const deptWorkDays = dept.workDays.map((w) => w.dayOfWeek)
      const today = getDayOfWeekInTimezone(timezone)

      const workDayFiltered = dept.employees.filter((emp) => {
        const effectiveDays = emp.workDays.map((w) => w.dayOfWeek)
        const activeDays = effectiveDays.length > 0 ? effectiveDays : deptWorkDays
        return activeDays.includes(today)
      })

      if (workDayFiltered.length === 0) continue

      const eligibleEmployees: HealthSurveyDispatchEmployee[] = workDayFiltered
        .map((emp) => ({
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          workStartTime: emp.workStartTime,
          workEndTime: emp.workEndTime,
          workDays: emp.workDays.map((w) => w.dayOfWeek),
        }))

      if (eligibleEmployees.length === 0) continue

      await sendDispatchTokensAndMessages(
        dispatch.id,
        dispatch.tenantId,
        eligibleEmployees,
        { workStartTime: dept.workStartTime, workEndTime: dept.workEndTime },
        config.workStartTime,
        config.workEndTime,
      )

      dispatched++
    } catch (err) {
      errors++
      logger.error({ err, dispatchId: dispatch.id }, "health-survey-dispatcher: error processing dispatch")
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

      if (!isWorkDay(config.workDays, timezone)) {
        skipped++
        continue
      }

      const intervalDays = FREQUENCY_INTERVAL_DAYS[config.frequency] ?? 7
      if (config.lastDispatchedAt !== null) {
        const daysSinceLast = (Date.now() - config.lastDispatchedAt.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLast < intervalDays) {
          skipped++
          continue
        }
      }

      const fired = await fireDispatch(
        config.id,
        config.tenantId,
        config.department.employees,
        config.department,
        config.workStartTime,
        config.workEndTime,
        timezone,
      )
      if (fired) triggered++
    } catch (err) {
      skipped++
      logger.error({ err, configId: config.id }, "auto-dispatcher: error triggering dispatch")
    }
  }

  return { triggered, skipped }
}

export async function checkHealthSurveyDispatchAdherence(): Promise<{ processed: number; alertsCreated: number }> {
  const ALERT_ADHERENCE_THRESHOLD = 0.8
  const dispatches = await findAllTenantsHealthSurveyDispatches48hAgo()
  let alertsCreated = 0

  for (const dispatch of dispatches) {
    const responseCount = await countHealthSurveyResponsesForDispatch(dispatch.tenantId, dispatch.id)
    const adherenceRate = dispatch.totalRecipients > 0 ? responseCount / dispatch.totalRecipients : 0

    if (adherenceRate < ALERT_ADHERENCE_THRESHOLD) {
      const departmentId = dispatch.healthSurveyConfiguration.departmentId
      const alertType = adherenceRate < 0.5 ? "no_response" : "low_adherence"
      const alreadyOpen = await hasOpenAlertOfType(dispatch.tenantId, alertType, departmentId)
      if (!alreadyOpen) {
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
  }

  return { processed: dispatches.length, alertsCreated }
}
