import { randomUUID } from "crypto"
import { addHours } from "date-fns"
import { getMessageQueue } from "@/libs/queue"
import { env } from "@/env"
import {
  findPendingDispatches,
  findActiveConfigsForAutoDispatch,
  createSurveyTokens,
  createDispatch,
  markDispatchSent,
  findDispatches48hAgo,
  countResponsesForDispatch,
  createAdherenceAlert,
  markDispatchAdherenceChecked,
} from "@/modules/surveys/survey.repository"

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  twice_weekly: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 28,
}

function getDayOfWeekInTimezone(timezone: string): number {
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(new Date())
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return dayMap[dayName] ?? new Date().getDay()
}

function isWorkDay(workDays: string, timezone: string): boolean {
  const today = getDayOfWeekInTimezone(timezone)
  return workDays.split(",").map((d) => parseInt(d, 10)).includes(today)
}

async function fireDispatch(
  configId: string,
  tenantId: string,
  employees: { id: string; phone: string; workStartTime: string | null; workEndTime: string | null }[],
  workStartTime: string,
  workEndTime: string,
): Promise<void> {
  const dispatch = await createDispatch(tenantId, configId, new Date())
  const messageQueue = getMessageQueue()

  const tokens = employees.map((emp) => ({
    tenantId,
    dispatchId: dispatch.id,
    employeeId: emp.id,
    token: randomUUID(),
    expiresAt: addHours(new Date(), 24),
    workStartTime: emp.workStartTime ?? workStartTime,
    workEndTime: emp.workEndTime ?? workEndTime,
  }))

  await createSurveyTokens(tokens)
  await markDispatchSent(tenantId, dispatch.id, employees.length)

  for (const empToken of tokens) {
    const employee = employees.find((e) => e.id === empToken.employeeId)
    if (!employee) continue
    const surveyUrl = `${env.NEXT_PUBLIC_APP_URL}/survey/${empToken.token}`
    await messageQueue.add("send-message", {
      to: employee.phone,
      body: `Pulse: Seu check-in diário está pronto. Por favor, responda em 2 minutos: ${surveyUrl}`,
      tenantId,
      employeeId: employee.id,
      provider: env.MESSAGING_PROVIDER,
      type: "survey_dispatch",
    })
  }
}

export async function runSurveyDispatcher(): Promise<{ dispatched: number; errors: number }> {
  const pendingDispatches = await findPendingDispatches()
  let dispatched = 0
  let errors = 0

  for (const dispatch of pendingDispatches) {
    const config = dispatch.surveyConfiguration
    const timezone = dispatch.organization.timezone

    if (!isWorkDay(config.workDays, timezone)) {
      continue
    }

    try {
      const employees = config.department.employees
      const tokens = employees.map((emp) => ({
        tenantId: dispatch.tenantId,
        dispatchId: dispatch.id,
        employeeId: emp.id,
        token: randomUUID(),
        expiresAt: addHours(new Date(), 24),
        workStartTime: emp.workStartTime ?? config.workStartTime,
        workEndTime: emp.workEndTime ?? config.workEndTime,
      }))

      await createSurveyTokens(tokens)
      await markDispatchSent(dispatch.tenantId, dispatch.id, employees.length)

      const messageQueue = getMessageQueue()
      for (const empToken of tokens) {
        const employee = employees.find((e) => e.id === empToken.employeeId)
        if (!employee) continue
        const surveyUrl = `${env.NEXT_PUBLIC_APP_URL}/survey/${empToken.token}`
        await messageQueue.add("send-message", {
          to: employee.phone,
          body: `Pulse: Seu check-in diário está pronto. Por favor, responda em 2 minutos: ${surveyUrl}`,
          tenantId: dispatch.tenantId,
          employeeId: employee.id,
          provider: env.MESSAGING_PROVIDER,
          type: "survey_dispatch",
        })
      }

      dispatched++
    } catch {
      errors++
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

      await fireDispatch(
        config.id,
        config.tenantId,
        config.department.employees,
        config.workStartTime,
        config.workEndTime,
      )
      triggered++
    } catch {
      skipped++
    }
  }

  return { triggered, skipped }
}

export async function checkDispatchAdherence(): Promise<{ processed: number; alertsCreated: number }> {
  const LOW_ADHERENCE_THRESHOLD = 0.5
  const dispatches = await findDispatches48hAgo()
  let alertsCreated = 0

  for (const dispatch of dispatches) {
    const responseCount = await countResponsesForDispatch(dispatch.tenantId, dispatch.id)
    const adherenceRate = dispatch.totalRecipients > 0 ? responseCount / dispatch.totalRecipients : 0

    if (adherenceRate < LOW_ADHERENCE_THRESHOLD) {
      await createAdherenceAlert({
        tenantId: dispatch.tenantId,
        departmentId: dispatch.surveyConfiguration.departmentId,
        adherenceRate,
        responseCount,
        totalRecipients: dispatch.totalRecipients,
      })
      alertsCreated++
    }

    await markDispatchAdherenceChecked(dispatch.tenantId, dispatch.id, responseCount)
  }

  return { processed: dispatches.length, alertsCreated }
}
