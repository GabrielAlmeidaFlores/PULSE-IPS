import { prisma } from "@/libs/db"

export type MessageLogType = "health_survey_dispatch" | "health_survey_reminder"

export interface CreateMessageLogInput {
  employeeId: string
  type: MessageLogType
  provider: string
  status: "sent" | "failed"
  externalId?: string
}

export async function createMessageLog(tenantId: string, data: CreateMessageLogInput): Promise<void> {
  await prisma.messageLog.create({ data: { ...data, tenantId } })
}
