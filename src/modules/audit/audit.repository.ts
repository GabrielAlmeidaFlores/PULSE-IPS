import { prisma } from "@/libs/db"
import type { CreateAuditLogInput } from "@/modules/audit/audit.types"

export async function createAuditLog(data: CreateAuditLogInput): Promise<void> {
  await prisma.auditLog.create({ data })
}
