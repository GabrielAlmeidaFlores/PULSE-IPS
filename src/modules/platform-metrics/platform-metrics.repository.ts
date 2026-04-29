import { prisma } from "@/libs/db"
import type { PlatformMetrics } from "@/modules/platform-metrics/platform-metrics.types"

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    totalOrganizations,
    activeOrganizations,
    newOrgsThisMonth,
    totalEmployees,
    totalResponses,
    activeSubscriptions,
    totalAlerts,
    openActionPlans,
    totalDocuments,
    recentOrgsRaw,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isActive: true } }),
    prisma.organization.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.employee.count({ where: { status: "active" } }),
    prisma.healthSurveyResponse.count(),
    prisma.organizationSubscription.count({ where: { status: "active" } }),
    prisma.alert.count(),
    prisma.actionPlan.count({ where: { status: "open" } }),
    prisma.document.count(),
    prisma.organization.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { name: true } },
        subscription: { select: { status: true, snapshotPriceInCents: true, snapshotInterval: true } },
        _count: { select: { employees: { where: { status: "active" } } } },
      },
    }),
  ])

  const subs = await prisma.organizationSubscription.findMany({
    where: { status: "active" },
    select: { snapshotPriceInCents: true, snapshotInterval: true },
  })

  const monthlyRevenueCents = subs.reduce((sum, sub) => {
    return sum + (sub.snapshotInterval === "year" ? Math.round(sub.snapshotPriceInCents / 12) : sub.snapshotPriceInCents)
  }, 0)

  const recentOrganizations = recentOrgsRaw.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    billingStatus: org.billingStatus,
    isActive: org.isActive,
    createdAt: org.createdAt,
    planName: org.plan?.name ?? null,
    employeeCount: org._count.employees,
    subscriptionStatus: org.subscription?.status ?? null,
    priceInCents: org.subscription?.snapshotPriceInCents ?? null,
  }))

  return {
    totalOrganizations,
    activeOrganizations,
    newOrgsThisMonth,
    totalEmployees,
    totalResponses,
    activeSubscriptions,
    monthlyRevenueCents,
    totalAlerts,
    openActionPlans,
    totalDocuments,
    recentOrganizations,
  }
}
