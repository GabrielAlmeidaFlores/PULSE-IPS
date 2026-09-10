import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getPendingTermsForUser } from "@/modules/terms/terms.service"
import { getTenantPlanFeatures, getTenantPlanSummary } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { Sidebar } from "@/libs/design-system/components/layout/Sidebar"
import { Header } from "@/libs/design-system/components/layout/Header"
import { SidebarProvider } from "@/libs/design-system/components/layout/sidebar-context"
import { BillingWallModal } from "@/app/(tenant)/billing/billing-wall-modal"
import { DeletionScheduledModal } from "@/app/(tenant)/deletion-scheduled-modal"

const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"])

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [pendingTerms, features, org, planSummary, departments] = await Promise.all([
    getPendingTermsForUser(session.userId),
    getTenantPlanFeatures(session.tenantId),
    getOrganization(session.tenantId),
    getTenantPlanSummary(session.tenantId),
    getActiveDepartments(session.tenantId),
  ])
  if (pendingTerms) redirect("/accept-terms")

  const billingStatus = org?.billingStatus ?? "pending"
  const deletionScheduledAt = org?.deletionScheduledAt ?? null
  const isInTrial = org?.trialExpiresAt !== null && org?.trialExpiresAt !== undefined && org.trialExpiresAt > new Date()
  const hasBillingWall = !isInTrial && deletionScheduledAt === null && !ACTIVE_BILLING_STATUSES.has(billingStatus)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar
          tenantId={session.tenantId}
          role={session.role}
          features={features}
          departments={departments.map((department) => ({ id: department.id, name: department.name }))}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            email={session.email}
            orgName={org?.name ?? ""}
            orgCnpj={org?.cnpj ?? null}
            planName={planSummary.planName}
            upgradeAvailable={planSummary.upgradeAvailable}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
        {deletionScheduledAt !== null && (
          <DeletionScheduledModal
            deletionScheduledAt={deletionScheduledAt.toISOString()}
            role={session.role}
          />
        )}
        {hasBillingWall && <BillingWallModal billingStatus={billingStatus} role={session.role} />}
      </div>
    </SidebarProvider>
  )
}
