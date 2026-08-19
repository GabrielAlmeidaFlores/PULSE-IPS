import { randomInt, randomUUID } from "crypto"
import { addDays, addHours } from "date-fns"
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz"
import { getMessageQueue, getEmailQueue } from "@/libs/queue"
import { env } from "@/env"
import { createLogger } from "@/libs/utils/logger"
import { getDayOfWeekInTimezone } from "@/libs/utils/date"
import {
  findAllTenantsPendingClimateSurveyDispatches,
  findAllTenantsActiveClimateSurveyConfigsForAutoDispatch,
  createClimateSurveyTokens,
  markClimateSurveyDispatchDispatched,
  createClimateSurveyDispatch,
  findAllTenantsClimateSurveyDispatches48hAgo,
  createClimateSurveyAdherenceAlert,
  markClimateSurveyDispatchAdherenceChecked,
  findExistingTokensForDispatch,
  upsertClimateSurveyDeptDispatch,
  countClimateSurveyResponsesByDispatchAndDept,
  type ClimateSurveyDispatchEmployee,
  type ClimateSurveyDispatchDepartment,
} from "@/modules/climate-surveys/climate-survey.repository"
import { recordClimateSurveyCampaignDispatched } from "@/modules/climate-surveys/climate-survey-analytics.service"
import { hasOpenAlertOfType } from "@/modules/alerts/alert.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { findEmployeeIdsEligibleForDispatch } from "@/modules/consent/consent.repository"

const logger = createLogger("climate-survey-dispatcher")

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  twice_weekly: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 28,
  quarterly: 90,
  semiannual: 180,
}

const DAY_OF_WEEK_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

interface EmployeeDispatchScheduleEntry {
  expiresAt: Date
  delayMs: number
}

function generateClimateSurveyTokenShortCode(): string {
  return randomInt(1000000, 10000000).toString()
}

function getDayOfWeekForDate(date: Date, timezone: string): number {
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(date)
  return DAY_OF_WEEK_MAP[dayName] ?? 0
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
  if (config.frequency === "once") return true
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

function findNextWorkDayShiftStart(
  effectiveWorkDays: number[],
  workStartTime: string,
  workEndTime: string,
  timezone: string,
  now: Date,
): Date | null {
  for (let offset = 0; offset <= 7; offset++) {
    const targetDate = addDays(now, offset)
    const dayOfWeek = getDayOfWeekForDate(targetDate, timezone)
    if (!effectiveWorkDays.includes(dayOfWeek)) continue

    const dateStr = formatInTimeZone(targetDate, timezone, "yyyy-MM-dd")
    const shiftStartUtc = fromZonedTime(new Date(`${dateStr}T${workStartTime}:00`), timezone)
    const shiftEndUtc = fromZonedTime(new Date(`${dateStr}T${workEndTime}:00`), timezone)

    if (offset === 0) {
      if (now >= shiftStartUtc && now < shiftEndUtc) return now
      if (now < shiftStartUtc) return shiftStartUtc
      continue
    }

    return shiftStartUtc
  }
  return null
}

function buildEmployeeDispatchScheduleMap(
  employees: ClimateSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string; workDays: number[] },
  timezone: string,
  now: Date,
  tokenExpiryHours: number,
): Map<string, EmployeeDispatchScheduleEntry> {
  const scheduleMap = new Map<string, EmployeeDispatchScheduleEntry>()

  for (const emp of employees) {
    const effectiveWorkDays = emp.workDays.length > 0 ? emp.workDays : department.workDays
    const workStartTime = emp.workStartTime ?? department.workStartTime
    const workEndTime = emp.workEndTime ?? department.workEndTime

    const scheduledSendAt = findNextWorkDayShiftStart(effectiveWorkDays, workStartTime, workEndTime, timezone, now)
    if (scheduledSendAt === null) continue

    const delayMs = Math.max(0, scheduledSendAt.getTime() - now.getTime())
    const expiresAt = addHours(scheduledSendAt, tokenExpiryHours)

    scheduleMap.set(emp.id, { expiresAt, delayMs })
  }

  return scheduleMap
}

async function sendDispatchTokensAndMessagesForDepartment(
  dispatchId: string,
  tenantId: string,
  orgSlug: string,
  orgName: string,
  departmentId: string,
  eligibleEmployees: ClimateSurveyDispatchEmployee[],
  department: { workStartTime: string; workEndTime: string; workDays: number[] },
  hasMessaging: boolean,
  sendViaEmail: boolean,
  respectEmployeeSchedule: boolean,
  timezone: string,
  tokenExpiryHours: number,
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
    existingTokens
      .filter((t) => t.usedAt === null && t.expiresAt > now)
      .map((t) => [t.employeeId, { token: t.token, shortCode: t.shortCode }]),
  )

  const toSendEmployees = dispatchTargetEmployees.filter((e) => !respondedEmployeeIds.has(e.id))

  const scheduleMap = respectEmployeeSchedule
    ? buildEmployeeDispatchScheduleMap(toSendEmployees, department, timezone, now, tokenExpiryHours)
    : new Map<string, EmployeeDispatchScheduleEntry>()

  const toSendFiltered = respectEmployeeSchedule
    ? toSendEmployees.filter((e) => existingUnusedTokenMap.has(e.id) || scheduleMap.has(e.id))
    : toSendEmployees

  const newTokenInputs = toSendFiltered
    .filter((e) => !existingUnusedTokenMap.has(e.id))
    .map((emp) => {
      const schedule = scheduleMap.get(emp.id)
      const expiresAt = schedule !== undefined ? schedule.expiresAt : addHours(now, tokenExpiryHours)
      const effectiveWorkDays = emp.workDays.length > 0 ? emp.workDays : department.workDays
      return {
        id: randomUUID(),
        tenantId,
        dispatchId,
        employeeId: emp.id,
        token: randomUUID(),
        shortCode: generateClimateSurveyTokenShortCode(),
        expiresAt,
        workStartTime: emp.workStartTime ?? department.workStartTime,
        workEndTime: emp.workEndTime ?? department.workEndTime,
        workDays: effectiveWorkDays,
      }
    })

  const newTokenMap = new Map(newTokenInputs.map((t) => [t.employeeId, { token: t.token, shortCode: t.shortCode }]))

  if (newTokenInputs.length > 0) {
    await createClimateSurveyTokens(newTokenInputs)
  }

  if (hasMessaging) {
    const messageQueue = getMessageQueue()
    const bulkJobs = toSendFiltered
      .map((emp) => {
        const tokenEntry = existingUnusedTokenMap.get(emp.id) ?? newTokenMap.get(emp.id)
        if (!tokenEntry) return null
        const climateSurveyUrl = tokenEntry.shortCode
          ? `${env.NEXT_PUBLIC_APP_URL}/climate-survey/${orgSlug}/${tokenEntry.shortCode}`
          : `${env.NEXT_PUBLIC_APP_URL}/climate-survey/${tokenEntry.token}`
        const schedule = scheduleMap.get(emp.id)
        const delayMs = schedule?.delayMs ?? 0
        return {
          name: "send-message" as const,
          data: {
            recipientPhone: emp.phone,
            recipientName: emp.name,
            orgName,
            surveyLink: climateSurveyUrl,
            tenantId,
            employeeId: emp.id,
            provider: env.MESSAGING_PROVIDER,
            type: "climate_survey_dispatch" as const,
            dispatchId,
          },
          ...(delayMs > 0 ? { opts: { delay: delayMs } } : {}),
        }
      })
      .filter((job): job is NonNullable<typeof job> => job !== null)

    if (bulkJobs.length > 0) {
      await messageQueue.addBulk(bulkJobs)
    }
  }

  if (sendViaEmail) {
    const emailQueue = getEmailQueue()
    const emailJobs = toSendFiltered
      .map((emp) => {
        if (emp.email === null || emp.email.trim() === "") return null
        const tokenEntry = existingUnusedTokenMap.get(emp.id) ?? newTokenMap.get(emp.id)
        if (!tokenEntry) return null
        const climateSurveyUrl = tokenEntry.shortCode
          ? `${env.NEXT_PUBLIC_APP_URL}/climate-survey/${orgSlug}/${tokenEntry.shortCode}`
          : `${env.NEXT_PUBLIC_APP_URL}/climate-survey/${tokenEntry.token}`
        const schedule = scheduleMap.get(emp.id)
        const delayMs = schedule?.delayMs ?? 0
        return {
          name: "send-email" as const,
          data: {
            recipientEmail: emp.email,
            recipientName: emp.name,
            orgName,
            surveyLink: climateSurveyUrl,
            tenantId,
            employeeId: emp.id,
            provider: env.EMAIL_PROVIDER,
            type: "climate_survey_dispatch" as const,
            tokenExpiryHours,
            dispatchId,
          },
          ...(delayMs > 0 ? { opts: { delay: delayMs } } : {}),
        }
      })
      .filter((job): job is NonNullable<typeof job> => job !== null)

    if (emailJobs.length > 0) {
      await emailQueue.addBulk(emailJobs)
    }
  }

  await upsertClimateSurveyDeptDispatch(dispatchId, departmentId, dispatchTargetEmployees.length)
  return dispatchTargetEmployees.length
}

async function fireDispatch(
  configId: string,
  tenantId: string,
  orgSlug: string,
  orgName: string,
  departments: ClimateSurveyDispatchDepartment[],
  timezone: string,
  respectEmployeeSchedule: boolean,
  tokenExpiryHours: number,
  sendViaMessaging: boolean,
  sendViaSignedLink: boolean,
): Promise<boolean> {
  const today = getDayOfWeekInTimezone(timezone)

  const departmentsWithEmployees = (
    respectEmployeeSchedule
      ? departments
      : departments.map((dept) => ({
          ...dept,
          employees: dept.employees.filter((emp) => {
            const effectiveDays = emp.workDays.length > 0 ? emp.workDays : dept.workDays
            return effectiveDays.includes(today)
          }),
        }))
  ).filter((dept) => dept.employees.length > 0)

  if (departmentsWithEmployees.length === 0) return false

  const signedLinkToken = sendViaSignedLink ? randomUUID() : undefined
  const dispatch = await createClimateSurveyDispatch(tenantId, configId, new Date(), "auto", signedLinkToken)

  const hasMessagingFeature = await hasTenantPlanFeature(tenantId, "messaging")
  const shouldSendMessages = sendViaMessaging && hasMessagingFeature

  for (const dept of departmentsWithEmployees) {
    await sendDispatchTokensAndMessagesForDepartment(
      dispatch.id,
      tenantId,
      orgSlug,
      orgName,
      dept.id,
      dept.employees,
      dept,
      shouldSendMessages,
      sendViaSignedLink,
      respectEmployeeSchedule,
      timezone,
      tokenExpiryHours,
    )
  }

  await markClimateSurveyDispatchDispatched(tenantId, dispatch.id)
  await recordClimateSurveyCampaignDispatched(tenantId, dispatch.id, configId)

  return true
}

export async function runClimateSurveyDispatcher(): Promise<{ dispatched: number; errors: number }> {
  const pendingDispatches = await findAllTenantsPendingClimateSurveyDispatches()
  let dispatched = 0
  let errors = 0

  for (const dispatch of pendingDispatches) {
    const config = dispatch.climateSurveyConfiguration
    const timezone = dispatch.organization.timezone
    const orgSlug = dispatch.organization.slug
    const orgName = dispatch.organization.name
    const respectEmployeeSchedule = config.respectEmployeeSchedule
    const tokenExpiryHours = config.tokenExpiryHours

    try {
      const today = getDayOfWeekInTimezone(timezone)
      const hasMessagingFeature = await hasTenantPlanFeature(dispatch.tenantId, "messaging")
      const shouldSendMessages = config.sendViaMessaging && hasMessagingFeature

      for (const cd of config.configDepartments) {
        const dept = cd.department
        const deptWorkDays = dept.workDays.map((w) => w.dayOfWeek)

        const workDayFiltered = respectEmployeeSchedule
          ? dept.employees
          : dept.employees.filter((emp) => {
              const effectiveDays = emp.workDays.map((w) => w.dayOfWeek)
              const activeDays = effectiveDays.length > 0 ? effectiveDays : deptWorkDays
              return activeDays.includes(today)
            })

        const eligibleEmployees: ClimateSurveyDispatchEmployee[] = workDayFiltered.map((emp) => ({
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          email: emp.email,
          workStartTime: emp.workStartTime,
          workEndTime: emp.workEndTime,
          workDays: emp.workDays.map((w) => w.dayOfWeek),
        }))

        if (eligibleEmployees.length > 0) {
          await sendDispatchTokensAndMessagesForDepartment(
            dispatch.id,
            dispatch.tenantId,
            orgSlug,
            orgName,
            dept.id,
            eligibleEmployees,
            { workStartTime: dept.workStartTime, workEndTime: dept.workEndTime, workDays: deptWorkDays },
            shouldSendMessages,
            config.sendViaSignedLink,
            respectEmployeeSchedule,
            timezone,
            tokenExpiryHours,
          )
        } else {
          await upsertClimateSurveyDeptDispatch(dispatch.id, dept.id, 0)
        }
      }

      await markClimateSurveyDispatchDispatched(dispatch.tenantId, dispatch.id)
      await recordClimateSurveyCampaignDispatched(
        dispatch.tenantId,
        dispatch.id,
        dispatch.climateSurveyConfigurationId,
      )
      dispatched++
    } catch (err) {
      errors++
      logger.error("climate-survey-dispatcher: erro ao processar dispatch", { err, dispatchId: dispatch.id })
    }
  }

  return { dispatched, errors }
}

export async function runClimateSurveyAutoDispatchScheduler(): Promise<{ triggered: number; skipped: number }> {
  const configs = await findAllTenantsActiveClimateSurveyConfigsForAutoDispatch()
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
        config.organization.slug,
        config.organization.name,
        config.departments,
        timezone,
        config.respectEmployeeSchedule,
        config.tokenExpiryHours,
        config.sendViaMessaging,
        config.sendViaSignedLink,
      )
      if (fired) triggered++
    } catch (err) {
      skipped++
      logger.error("auto-dispatcher: erro ao disparar pesquisa", { err, configId: config.id })
    }
  }

  return { triggered, skipped }
}

export async function checkClimateSurveyDispatchAdherence(): Promise<{ processed: number; alertsCreated: number }> {
  const ALERT_ADHERENCE_THRESHOLD = 0.8
  const dispatches = await findAllTenantsClimateSurveyDispatches48hAgo()
  let alertsCreated = 0

  for (const dispatch of dispatches) {
    try {
      for (const deptDispatch of dispatch.deptDispatches) {
        if (deptDispatch.totalRecipients === 0) continue

        const actualResponseCount = await countClimateSurveyResponsesByDispatchAndDept(dispatch.id, deptDispatch.departmentId)
        const adherenceRate = Math.min(1.0, actualResponseCount / deptDispatch.totalRecipients)

        if (adherenceRate < ALERT_ADHERENCE_THRESHOLD) {
          const alreadyOpenNoResponse = await hasOpenAlertOfType(dispatch.tenantId, "no_response", deptDispatch.departmentId)
          const alreadyOpenLowAdherence = await hasOpenAlertOfType(dispatch.tenantId, "low_adherence", deptDispatch.departmentId)
          if (!alreadyOpenNoResponse && !alreadyOpenLowAdherence) {
            await createClimateSurveyAdherenceAlert({
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

      await markClimateSurveyDispatchAdherenceChecked(dispatch.tenantId, dispatch.id)
    } catch (err) {
      logger.error("adherence-checker: erro ao processar dispatch", { err, dispatchId: dispatch.id, tenantId: dispatch.tenantId })
    }
  }

  return { processed: dispatches.length, alertsCreated }
}
