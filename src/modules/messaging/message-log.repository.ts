import { prisma } from "@/libs/db"

export type MessageLogType = "survey_dispatch"

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
