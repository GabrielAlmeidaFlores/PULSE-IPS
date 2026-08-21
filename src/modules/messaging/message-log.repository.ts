import { prisma } from "@/libs/db"

export type MessageLogType =
  | "health_survey_dispatch"
  | "health_survey_reminder"
  | "climate_survey_dispatch"
  | "climate_survey_reminder"

export type MessageLogStatus = "queued" | "sent" | "delivered" | "read" | "failed"

export interface CreateMessageLogInput {
  employeeId: string
  type: MessageLogType
  provider: string
  status: MessageLogStatus
  surveyLink: string
  dispatchId?: string
  externalId?: string
  errorMessage?: string
  queueJobId?: string
  deliveredAt?: Date
  readAt?: Date
  failedAt?: Date
}

export interface UpdateMessageLogStatusInput {
  status: MessageLogStatus
  errorMessage?: string
  deliveredAt?: Date
  readAt?: Date
  failedAt?: Date
}

export interface MessageLogRecord {
  id: string
  tenantId: string
  employeeId: string | null
  dispatchId: string | null
  type: string
  provider: string
  externalId: string | null
  surveyLink: string | null
  status: string
  errorMessage: string | null
  queueJobId: string | null
  sentAt: Date
  deliveredAt: Date | null
  readAt: Date | null
  failedAt: Date | null
  updatedAt: Date
}

export function createMessageLog(tenantId: string, data: CreateMessageLogInput): Promise<MessageLogRecord> {
  return prisma.messageLog.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      type: data.type,
      provider: data.provider,
      status: data.status,
      surveyLink: data.surveyLink,
      ...(data.dispatchId !== undefined ? { dispatchId: data.dispatchId } : {}),
      ...(data.externalId !== undefined ? { externalId: data.externalId } : {}),
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      ...(data.queueJobId !== undefined ? { queueJobId: data.queueJobId } : {}),
      ...(data.deliveredAt !== undefined ? { deliveredAt: data.deliveredAt } : {}),
      ...(data.readAt !== undefined ? { readAt: data.readAt } : {}),
      ...(data.failedAt !== undefined ? { failedAt: data.failedAt } : {}),
    },
  })
}

export function findMessageLogByExternalId(externalId: string): Promise<MessageLogRecord | null> {
  return prisma.messageLog.findFirst({
    where: { externalId },
    orderBy: { sentAt: "desc" },
  })
}

export function findMessageLogByQueueJobId(queueJobId: string): Promise<MessageLogRecord | null> {
  return prisma.messageLog.findFirst({
    where: { queueJobId },
    orderBy: { sentAt: "desc" },
  })
}

export function updateMessageLogStatusById(
  id: string,
  data: UpdateMessageLogStatusInput,
): Promise<MessageLogRecord> {
  return prisma.messageLog.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      ...(data.deliveredAt !== undefined ? { deliveredAt: data.deliveredAt } : {}),
      ...(data.readAt !== undefined ? { readAt: data.readAt } : {}),
      ...(data.failedAt !== undefined ? { failedAt: data.failedAt } : {}),
    },
  })
}

export function findMessageLogsByDispatch(
  tenantId: string,
  dispatchId: string,
): Promise<MessageLogRecord[]> {
  return prisma.messageLog.findMany({
    where: { tenantId, dispatchId },
    orderBy: { sentAt: "desc" },
  })
}
