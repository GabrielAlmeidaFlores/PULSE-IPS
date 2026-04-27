import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getPendingTermsForUser } from "@/modules/terms/terms.service"
import { getTenantPlanFeatures } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { Sidebar } from "@/libs/design-system/components/layout/Sidebar"
import { Header } from "@/libs/design-system/components/layout/Header"
import { BillingWallModal } from "@/app/(tenant)/billing/billing-wall-modal"

const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"])

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [pendingTerms, features, org] = await Promise.all([
    getPendingTermsForUser(session.userId),
    getTenantPlanFeatures(session.tenantId),
    getOrganization(session.tenantId),
  ])
  if (pendingTerms) redirect("/accept-terms")

  const billingStatus = org?.billingStatus ?? "pending"
  const hasBillingWall = !ACTIVE_BILLING_STATUSES.has(billingStatus)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar tenantId={session.tenantId} role={session.role} features={features} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header email={session.email} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      {hasBillingWall && <BillingWallModal billingStatus={billingStatus} />}
    </div>
  )
}
