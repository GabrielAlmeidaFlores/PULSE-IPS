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
  createHealthSurveyAdherenceAlert,
  markHealthSurveyDispatchAdherenceChecked,
  findExistingTokensForDispatch,
  upsertHealthSurveyDeptDispatch,
  countHealthSurveyResponsesByDispatchAndDept,
  type HealthSurveyDispatchEmployee,
  type HealthSurveyDispatchDepartment,
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
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 60
}

async function sendDispatchTokensAndMessagesForDepartment(
  dispatchId: string,
  tenantId: string,
  departmentId: string,
  eligibleEmployees: HealthSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string },
  hasMessaging: boolean,
): Promise<number> {
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

  await upsertHealthSurveyDeptDispatch(dispatchId, departmentId, dispatchTargetEmployees.length)
  return dispatchTargetEmployees.length
}

async function fireDispatch(
  configId: string,
  tenantId: string,
  departments: HealthSurveyDispatchDepartment[],
  timezone: string,
): Promise<boolean> {
  const today = getDayOfWeekInTimezone(timezone)

  const departmentsWithEmployees = departments.map((dept) => ({
    ...dept,
    employees: dept.employees.filter((emp) => {
      const effectiveDays = emp.workDays.length > 0 ? emp.workDays : dept.workDays
      return effectiveDays.includes(today)
    }),
  })).filter((dept) => dept.employees.length > 0)

  if (departmentsWithEmployees.length === 0) return false

  const signedLinkToken = randomUUID()
  const dispatch = await createHealthSurveyDispatch(tenantId, configId, new Date(), signedLinkToken)

  const hasMessaging = await hasTenantPlanFeature(tenantId, "messaging")

  for (const dept of departmentsWithEmployees) {
    await sendDispatchTokensAndMessagesForDepartment(
      dispatch.id,
      tenantId,
      dept.id,
      dept.employees,
      dept,
      hasMessaging,
    )
  }

  await markHealthSurveyDispatchDispatched(tenantId, dispatch.id)

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
      const today = getDayOfWeekInTimezone(timezone)
      const hasMessaging = await hasTenantPlanFeature(dispatch.tenantId, "messaging")

      for (const cd of config.configDepartments) {
        const dept = cd.department
        const deptWorkDays = dept.workDays.map((w) => w.dayOfWeek)

        const workDayFiltered = dept.employees.filter((emp) => {
          const effectiveDays = emp.workDays.map((w) => w.dayOfWeek)
          const activeDays = effectiveDays.length > 0 ? effectiveDays : deptWorkDays
          return activeDays.includes(today)
        })

        const eligibleEmployees: HealthSurveyDispatchEmployee[] = workDayFiltered.map((emp) => ({
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          workStartTime: emp.workStartTime,
          workEndTime: emp.workEndTime,
          workDays: emp.workDays.map((w) => w.dayOfWeek),
        }))

        if (eligibleEmployees.length > 0) {
          await sendDispatchTokensAndMessagesForDepartment(
            dispatch.id,
            dispatch.tenantId,
            dept.id,
            eligibleEmployees,
            { workStartTime: dept.workStartTime, workEndTime: dept.workEndTime },
            hasMessaging,
          )
        } else {
          await upsertHealthSurveyDeptDispatch(dispatch.id, dept.id, 0)
        }
      }

      await markHealthSurveyDispatchDispatched(dispatch.tenantId, dispatch.id)
      dispatched++
    } catch (err) {
      errors++
      logger.error("health-survey-dispatcher: erro ao processar dispatch", { err, dispatchId: dispatch.id })
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
        config.departments,
        timezone,
      )
      if (fired) triggered++
    } catch (err) {
      skipped++
      logger.error("auto-dispatcher: erro ao disparar pesquisa", { err, configId: config.id })
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
      for (const deptDispatch of dispatch.deptDispatches) {
        if (deptDispatch.totalRecipients === 0) continue

        const actualResponseCount = await countHealthSurveyResponsesByDispatchAndDept(dispatch.id, deptDispatch.departmentId)
        const adherenceRate = Math.min(1.0, actualResponseCount / deptDispatch.totalRecipients)

        if (adherenceRate < ALERT_ADHERENCE_THRESHOLD) {
          const alreadyOpenNoResponse = await hasOpenAlertOfType(dispatch.tenantId, "no_response", deptDispatch.departmentId)
          const alreadyOpenLowAdherence = await hasOpenAlertOfType(dispatch.tenantId, "low_adherence", deptDispatch.departmentId)
          if (!alreadyOpenNoResponse && !alreadyOpenLowAdherence) {
            await createHealthSurveyAdherenceAlert({
              tenantId: dispatch.tenantId,
              departmentId: deptDispatch.departmentId,
              adherenceRate,
              responseCount: actualResponseCount,
              totalRecipients: deptDispatch.totalRecipients,
            })
            alertsCreated++
          }
        }
      }

      await markHealthSurveyDispatchAdherenceChecked(dispatch.tenantId, dispatch.id)
    } catch (err) {
      logger.error("adherence-checker: erro ao processar dispatch", { err, dispatchId: dispatch.id, tenantId: dispatch.tenantId })
    }
  }

  return { processed: dispatches.length, alertsCreated }
}
