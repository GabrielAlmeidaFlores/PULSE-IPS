import { addDays } from "date-fns"
import type { PgrReportData } from "@/modules/pgr/pgr.types"
import type { PgrReview } from "@prisma/client"
import {
  findPgrReviewsByTenant,
  findOrgWithDepartmentsForPgr,
  findDispatchesForPgr,
  createPgrReview,
  findUpcomingPgrReviews,
  findExistingPgrAlert,
  createPgrAlert,
} from "@/modules/pgr/pgr.repository"

export function getPgrReviews(tenantId: string): Promise<PgrReview[]> {
  return findPgrReviewsByTenant(tenantId)
}

export async function generatePgrReport(tenantId: string, period: string): Promise<PgrReportData> {
  const org = await findOrgWithDepartmentsForPgr(tenantId)

  const dispatches = await findDispatchesForPgr(tenantId)

  const deptData = org.departments.map((dept) => {
    const deptDispatches = dispatches.filter(
      (d) => d.surveyConfiguration.departmentId === dept.id,
    )
    const allResponses = deptDispatches.flatMap((d) => d.responses)
    const allItems = allResponses.flatMap((r) => r.items)
    const avgScore =
      allItems.length > 0
        ? allItems.reduce((sum, item) => sum + item.score, 0) / allItems.length
        : 0

    const totalRecipients = deptDispatches.reduce((sum, d) => sum + d.totalRecipients, 0)
    const responseRate = totalRecipients > 0 ? allResponses.length / totalRecipients : 0

    return {
      name: dept.name,
      employeeCount: dept.employees.length,
      avgScore,
      responseRate,
    }
  })

  await createPgrReview({
    tenantId,
    period,
    status: "generated",
    reviewedAt: new Date(),
  })

  return {
    organizationName: org.name,
    period,
    totalEmployees: org.departments.reduce((sum, d) => sum + d.employees.length, 0),
    departments: deptData,
    generatedAt: new Date(),
  }
}

export async function sendPgrReviewReminders(): Promise<{ remindersCreated: number }> {
  const DAYS_BEFORE_REVIEW = 30
  const reminderDate = addDays(new Date(), DAYS_BEFORE_REVIEW)
  reminderDate.setHours(0, 0, 0, 0)
  const reminderDateEnd = addDays(reminderDate, 1)

  const upcomingReviews = await findUpcomingPgrReviews(reminderDate, reminderDateEnd)

  let remindersCreated = 0

  for (const review of upcomingReviews) {
    const existingAlert = await findExistingPgrAlert(review.tenantId)

    if (!existingAlert) {
      await createPgrAlert({
        tenantId: review.tenantId,
        type: "pgr_review_due",
        severity: "warning",
        message: `PGR review is due in ${DAYS_BEFORE_REVIEW} days (${review.nextReviewAt?.toLocaleDateString("pt-BR") ?? "unknown"})`,
      })
      remindersCreated++
    }
  }

  return { remindersCreated }
}
