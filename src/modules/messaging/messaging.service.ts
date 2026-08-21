import { getMessagingService } from "@/libs/integrations"
import type { SendMessageJobData } from "@/libs/queue"
import {
  createMessageLog,
  findMessageLogByExternalId,
  findMessageLogByQueueJobId,
  findMessageLogsByDispatch,
  updateMessageLogStatusById,
  type MessageLogRecord,
  type MessageLogStatus,
} from "@/modules/messaging/message-log.repository"

export type { MessageLogStatus }

export interface ProcessOutboundMessageInput {
  data: SendMessageJobData
  queueJobId: string | null
}

export interface ApplyMessageDeliveryStatusInput {
  externalId: string
  status: MessageLogStatus
  errorMessage?: string
  occurredAt?: Date
}

export interface ParsedMessageDeliveryEvent {
  externalId: string
  status: MessageLogStatus
  errorMessage?: string
  occurredAt?: Date
}

const STATUS_PROGRESSION: Record<MessageLogStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
}

function mapProviderResultStatus(status: "queued" | "sent" | "failed"): MessageLogStatus {
  if (status === "failed") return "failed"
  return "sent"
}

function shouldApplyStatusTransition(current: string, next: MessageLogStatus): boolean {
  if (current === next) return false
  if (next === "failed") return current !== "failed"
  if (current === "failed") return false
  const currentRank = STATUS_PROGRESSION[current as MessageLogStatus] ?? -1
  const nextRank = STATUS_PROGRESSION[next]
  return nextRank > currentRank
}

function parseOccurredAt(value: string | number | undefined): Date | undefined {
  if (value === undefined) return undefined
  if (typeof value === "number") {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  const asNumber = Number(value)
  if (!Number.isNaN(asNumber) && value.trim() !== "") {
    const ms = asNumber < 1_000_000_000_000 ? asNumber * 1000 : asNumber
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime())) return date
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function buildDeliveryEvent(
  externalId: string,
  rawStatus: string,
  errorMessage?: string,
  timestamp?: string | number,
): ParsedMessageDeliveryEvent | null {
  const status = normalizeProviderDeliveryStatus(rawStatus)
  if (status === null) return null
  const occurredAt = parseOccurredAt(timestamp)
  return {
    externalId,
    status,
    ...(errorMessage !== undefined ? { errorMessage } : {}),
    ...(occurredAt !== undefined ? { occurredAt } : {}),
  }
}

function extractFlatDeliveryEvents(payload: unknown): ParsedMessageDeliveryEvent[] {
  if (typeof payload !== "object" || payload === null) return []
  const record = payload as { id?: unknown; status?: unknown; error?: unknown; timestamp?: unknown }
  if (typeof record.id !== "string" || typeof record.status !== "string") return []
  const errorMessage = typeof record.error === "string" ? record.error : undefined
  const timestamp =
    typeof record.timestamp === "string" || typeof record.timestamp === "number"
      ? record.timestamp
      : undefined
  const event = buildDeliveryEvent(record.id, record.status, errorMessage, timestamp)
  return event === null ? [] : [event]
}

function extractStatusesFromChangeValue(value: unknown): ParsedMessageDeliveryEvent[] {
  if (typeof value !== "object" || value === null) return []
  const statuses = (value as { statuses?: unknown }).statuses
  if (!Array.isArray(statuses)) return []

  const events: ParsedMessageDeliveryEvent[] = []
  for (const statusItem of statuses) {
    if (typeof statusItem !== "object" || statusItem === null) continue
    const item = statusItem as {
      id?: unknown
      status?: unknown
      timestamp?: unknown
      errors?: { title?: string; message?: string }[]
    }
    if (typeof item.id !== "string" || typeof item.status !== "string") continue
    const errorMessage = item.errors?.[0]?.title ?? item.errors?.[0]?.message
    const timestamp =
      typeof item.timestamp === "string" || typeof item.timestamp === "number"
        ? item.timestamp
        : undefined
    const event = buildDeliveryEvent(item.id, item.status, errorMessage, timestamp)
    if (event !== null) events.push(event)
  }
  return events
}

function extractMetaStyleDeliveryEvents(payload: unknown): ParsedMessageDeliveryEvent[] {
  if (typeof payload !== "object" || payload === null) return []
  const entryList = (payload as { entry?: unknown }).entry
  if (!Array.isArray(entryList)) return []

  const events: ParsedMessageDeliveryEvent[] = []
  for (const entry of entryList) {
    if (typeof entry !== "object" || entry === null) continue
    const changes = (entry as { changes?: unknown }).changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      if (typeof change !== "object" || change === null) continue
      events.push(...extractStatusesFromChangeValue((change as { value?: unknown }).value))
    }
  }
  return events
}

export function parseMessagingDeliveryWebhookPayload(payload: unknown): ParsedMessageDeliveryEvent[] {
  return [...extractFlatDeliveryEvents(payload), ...extractMetaStyleDeliveryEvents(payload)]
}

export async function processOutboundSurveyMessage(input: ProcessOutboundMessageInput): Promise<void> {
  const messaging = getMessagingService()
  const params = {
    recipientPhone: input.data.recipientPhone,
    recipientName: input.data.recipientName,
    orgName: input.data.orgName,
    surveyLink: input.data.surveyLink,
  }

  let result
  if (input.data.type === "health_survey_dispatch") {
    result = await messaging.sendHealthSurveyDispatch(params)
  } else if (input.data.type === "health_survey_reminder") {
    result = await messaging.sendHealthSurveyReminder(params)
  } else if (input.data.type === "climate_survey_dispatch") {
    result = await messaging.sendClimateSurveyDispatch(params)
  } else {
    result = await messaging.sendClimateSurveyReminder(params)
  }

  const status = mapProviderResultStatus(result.status)
  const now = new Date()

  await createMessageLog(input.data.tenantId, {
    employeeId: input.data.employeeId,
    type: input.data.type,
    provider: input.data.provider,
    status,
    surveyLink: input.data.surveyLink,
    ...(input.data.dispatchId !== undefined ? { dispatchId: input.data.dispatchId } : {}),
    ...(result.externalId !== null ? { externalId: result.externalId } : {}),
    ...(result.error !== undefined ? { errorMessage: result.error } : {}),
    ...(input.queueJobId !== null ? { queueJobId: input.queueJobId } : {}),
    ...(status === "failed" ? { failedAt: now } : {}),
  })
}

export async function recordOutboundSurveyMessageFinalFailure(
  data: SendMessageJobData,
  queueJobId: string | null,
  errorMessage: string,
): Promise<void> {
  if (queueJobId !== null) {
    const existing = await findMessageLogByQueueJobId(queueJobId)
    if (existing !== null) return
  }

  await createMessageLog(data.tenantId, {
    employeeId: data.employeeId,
    type: data.type,
    provider: data.provider,
    status: "failed",
    surveyLink: data.surveyLink,
    errorMessage,
    failedAt: new Date(),
    ...(data.dispatchId !== undefined ? { dispatchId: data.dispatchId } : {}),
    ...(queueJobId !== null ? { queueJobId } : {}),
  })
}

export async function applyMessageDeliveryStatus(
  input: ApplyMessageDeliveryStatusInput,
): Promise<MessageLogRecord | null> {
  const existing = await findMessageLogByExternalId(input.externalId)
  if (existing === null) return null

  if (!shouldApplyStatusTransition(existing.status, input.status)) {
    return existing
  }

  const occurredAt = input.occurredAt ?? new Date()
  return updateMessageLogStatusById(existing.id, {
    status: input.status,
    ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
    ...(input.status === "delivered" ? { deliveredAt: occurredAt } : {}),
    ...(input.status === "read" ? { readAt: occurredAt, deliveredAt: existing.deliveredAt ?? occurredAt } : {}),
    ...(input.status === "failed" ? { failedAt: occurredAt } : {}),
  })
}

export function listDispatchMessageLogs(
  tenantId: string,
  dispatchId: string,
): Promise<MessageLogRecord[]> {
  return findMessageLogsByDispatch(tenantId, dispatchId)
}

export function normalizeProviderDeliveryStatus(rawStatus: string): MessageLogStatus | null {
  const normalized = rawStatus.trim().toLowerCase()
  if (normalized === "queued" || normalized === "pending" || normalized === "new") return "queued"
  if (normalized === "sent" || normalized === "enviado" || normalized === "sendingok") return "sent"
  if (normalized === "delivered" || normalized === "entregue" || normalized === "delivery") return "delivered"
  if (normalized === "read" || normalized === "lido" || normalized === "seen") return "read"
  if (
    normalized === "failed" ||
    normalized === "falhou" ||
    normalized === "failure" ||
    normalized === "sendingerror" ||
    normalized === "undelivered" ||
    normalized === "error"
  ) {
    return "failed"
  }
  return null
}
