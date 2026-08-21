import { prisma } from "@/libs/db"

export type EmailLogType = "climate_survey_dispatch" | "climate_survey_reminder"

export type EmailLogStatus = "sent" | "failed" | "opened" | "clicked"

export interface CreateEmailLogInput {
  employeeId: string
  type: EmailLogType
  provider: string
  status: EmailLogStatus
  recipientEmail: string
  surveyLink: string
  trackingToken: string
  dispatchId?: string
  externalId?: string
  errorMessage?: string
  queueJobId?: string
  failedAt?: Date
}

export interface EmailLogRecord {
  id: string
  tenantId: string
  employeeId: string | null
  dispatchId: string | null
  type: string
  provider: string
  externalId: string | null
  recipientEmail: string
  surveyLink: string
  trackingToken: string
  status: string
  errorMessage: string | null
  queueJobId: string | null
  sentAt: Date
  openedAt: Date | null
  clickedAt: Date | null
  failedAt: Date | null
  updatedAt: Date
}

export function createEmailLog(tenantId: string, data: CreateEmailLogInput): Promise<EmailLogRecord> {
  return prisma.emailLog.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      type: data.type,
      provider: data.provider,
      status: data.status,
      recipientEmail: data.recipientEmail,
      surveyLink: data.surveyLink,
      trackingToken: data.trackingToken,
      ...(data.dispatchId !== undefined ? { dispatchId: data.dispatchId } : {}),
      ...(data.externalId !== undefined ? { externalId: data.externalId } : {}),
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      ...(data.queueJobId !== undefined ? { queueJobId: data.queueJobId } : {}),
      ...(data.failedAt !== undefined ? { failedAt: data.failedAt } : {}),
    },
  })
}

export function findEmailLogByTrackingToken(trackingToken: string): Promise<EmailLogRecord | null> {
  return prisma.emailLog.findUnique({ where: { trackingToken } })
}

export function findEmailLogByQueueJobId(queueJobId: string): Promise<EmailLogRecord | null> {
  return prisma.emailLog.findFirst({
    where: { queueJobId },
    orderBy: { sentAt: "desc" },
  })
}

export function markEmailLogOpened(id: string, openedAt: Date): Promise<EmailLogRecord> {
  return prisma.emailLog.update({
    where: { id },
    data: {
      status: "opened",
      openedAt,
    },
  })
}

export function markEmailLogClicked(id: string, clickedAt: Date, openedAt: Date | null): Promise<EmailLogRecord> {
  return prisma.emailLog.update({
    where: { id },
    data: {
      status: "clicked",
      clickedAt,
      ...(openedAt === null ? { openedAt: clickedAt } : {}),
    },
  })
}

export function findEmailLogsByDispatch(tenantId: string, dispatchId: string): Promise<EmailLogRecord[]> {
  return prisma.emailLog.findMany({
    where: { tenantId, dispatchId },
    orderBy: { sentAt: "desc" },
  })
}
