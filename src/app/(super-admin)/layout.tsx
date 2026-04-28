import { redirect } from "next/navigation"
import { getSuperAdminSession } from "@/modules/auth/session"
import { SuperAdminSidebar } from "@/libs/design-system/components/layout/SuperAdminSidebar"
import { SuperAdminHeader } from "@/libs/design-system/components/layout/SuperAdminHeader"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.ReactElement> {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <SuperAdminHeader email={session.email} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
