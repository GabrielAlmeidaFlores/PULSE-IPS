import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getPendingTermsForUser } from "@/modules/terms/terms.service"
import { Sidebar } from "@/libs/design-system/components/layout/Sidebar"
import { Header } from "@/libs/design-system/components/layout/Header"

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const pendingTerms = await getPendingTermsForUser(session.userId)
  if (pendingTerms) redirect("/accept-terms")

  return (
    <div className="flex h-screen bg-background">
      <Sidebar tenantId={session.tenantId} role={session.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header email={session.email} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
