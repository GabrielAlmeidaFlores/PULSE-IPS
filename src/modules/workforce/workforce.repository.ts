import { prisma } from "@/libs/db"
import type { WorkforceMonthlyRecord } from "@/modules/workforce/workforce.types"

export function findWorkforceMonthlyRecords(tenantId: string): Promise<WorkforceMonthlyRecord[]> {
  return prisma.employeeMonthly.findMany({
    where: { tenantId },
    select: {
      competencia: true,
      employeeName: true,
      document: true,
      registration: true,
      departmentName: true,
      admissionDate: true,
      terminationDate: true,
      expectedHours: true,
      justifiedAbsenceHours: true,
      unjustifiedAbsenceHours: true,
      createdAt: true,
    },
    orderBy: [{ competencia: "asc" }, { departmentName: "asc" }],
  })
}
