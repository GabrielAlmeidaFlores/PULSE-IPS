import { prisma } from "@/libs/db"

export type MessageLogType = "consent_invite" | "survey_dispatch" | "survey_resend"

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
