import { randomUUID } from "crypto"
import { addHours } from "date-fns"
import { getMessageQueue } from "@/libs/queue"
import { env } from "@/env"
import { logger } from "@/libs/logger"
import {
  findAllTenantsPendingDispatches,
  findActiveConfigsForAutoDispatch,
  createSurveyTokens,
  createDispatch,
  markDispatchSent,
  findAllTenantsDispatches48hAgo,
  countResponsesForDispatch,
  createAdherenceAlert,
  markDispatchAdherenceChecked,
  type DispatchEmployee,
} from "@/modules/surveys/survey.repository"
import { hasOpenAlertOfType } from "@/modules/alerts/alert.repository"
import { findEmployeeIdsWithAcceptedConsent } from "@/modules/consent/consent.repository"

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  twice_weekly: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 28,
}

function buildSurveyMessage(template: string, employeeName: string, surveyUrl: string): string {
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

async function fireDispatch(
  configId: string,
  tenantId: string,
  employees: DispatchEmployee[],
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

  const acceptedIds = await findEmployeeIdsWithAcceptedConsent(tenantId, workDayFiltered.map((e) => e.id))
  const eligibleEmployees = workDayFiltered.filter((emp) => acceptedIds.includes(emp.id))

  if (eligibleEmployees.length === 0) return false

  const dispatch = await createDispatch(tenantId, configId, new Date())

  const tokens = eligibleEmployees.map((emp) => ({
    tenantId,
    dispatchId: dispatch.id,
    employeeId: emp.id,
    token: randomUUID(),
    expiresAt: addHours(new Date(), 24),
    workStartTime: emp.workStartTime ?? department.workStartTime ?? configWorkStartTime,
    workEndTime: emp.workEndTime ?? department.workEndTime ?? configWorkEndTime,
  }))

  await createSurveyTokens(tokens)
  await markDispatchSent(tenantId, dispatch.id, eligibleEmployees.length)

  const messageQueue = getMessageQueue()
  const bulkJobs = tokens
    .map((empToken) => {
      const employee = eligibleEmployees.find((e) => e.id === empToken.employeeId)
      if (!employee) return null
      const surveyUrl = `${env.NEXT_PUBLIC_APP_URL}/survey/${empToken.token}`
      return {
        name: "send-message" as const,
        data: {
          to: employee.phone,
          body: buildSurveyMessage(env.SURVEY_MESSAGE_TEMPLATE, employee.name, surveyUrl),
          tenantId,
          employeeId: employee.id,
          provider: env.MESSAGING_PROVIDER,
          type: "survey_dispatch" as const,
          templateName: env.WHATSAPP_SURVEY_TEMPLATE_NAME,
          templateVariables: [employee.name, surveyUrl],
        },
      }
    })
    .filter((job): job is NonNullable<typeof job> => job !== null)

  await messageQueue.addBulk(bulkJobs)
  return true
}

export async function runSurveyDispatcher(): Promise<{ dispatched: number; errors: number }> {
  const pendingDispatches = await findAllTenantsPendingDispatches()
  let dispatched = 0
  let errors = 0

  for (const dispatch of pendingDispatches) {
    const config = dispatch.surveyConfiguration
    const timezone = dispatch.organization.timezone

    if (!isWorkDay(config.workDays.map((w) => w.dayOfWeek), timezone)) {
      continue
    }

    try {
      const dept = config.department
      const deptWorkDays = dept.workDays.map((w) => w.dayOfWeek)
      const employees: DispatchEmployee[] = dept.employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        phone: emp.phone,
        workStartTime: emp.workStartTime,
        workEndTime: emp.workEndTime,
        workDays: emp.workDays.map((w) => w.dayOfWeek),
      }))

      const fired = await fireDispatch(
        config.id,
        dispatch.tenantId,
        employees,
        { workStartTime: dept.workStartTime, workEndTime: dept.workEndTime, workDays: deptWorkDays },
        config.workStartTime,
        config.workEndTime,
        timezone,
      )

      if (fired) dispatched++
    } catch (err) {
      errors++
      logger.error({ err, configId: config.id }, "survey-dispatcher: error processing dispatch")
    }
  }

  return { dispatched, errors }
}

export async function runAutoDispatchScheduler(): Promise<{ triggered: number; skipped: number }> {
  const configs = await findActiveConfigsForAutoDispatch()
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

export async function checkDispatchAdherence(): Promise<{ processed: number; alertsCreated: number }> {
  const ALERT_ADHERENCE_THRESHOLD = 0.8
  const dispatches = await findAllTenantsDispatches48hAgo()
  let alertsCreated = 0

  for (const dispatch of dispatches) {
    const responseCount = await countResponsesForDispatch(dispatch.tenantId, dispatch.id)
    const adherenceRate = dispatch.totalRecipients > 0 ? responseCount / dispatch.totalRecipients : 0

    if (adherenceRate < ALERT_ADHERENCE_THRESHOLD) {
      const departmentId = dispatch.surveyConfiguration.departmentId
      const alreadyOpen = await hasOpenAlertOfType(dispatch.tenantId, "low_adherence", departmentId)
      if (!alreadyOpen) {
        await createAdherenceAlert({
          tenantId: dispatch.tenantId,
          departmentId,
          adherenceRate,
          responseCount,
          totalRecipients: dispatch.totalRecipients,
        })
        alertsCreated++
      }
    }

    await markDispatchAdherenceChecked(dispatch.tenantId, dispatch.id, responseCount)
  }

  return { processed: dispatches.length, alertsCreated }
}
