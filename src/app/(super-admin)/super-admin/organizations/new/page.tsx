import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSuperAdminSession } from "@/modules/auth/session"
import { redirect } from "next/navigation"
import { getAllPlansAdmin } from "@/modules/plans/plan.service"
import { CreateOrgForm } from "@/app/(super-admin)/super-admin/organizations/new/create-org-form"

export default async function NewOrganizationPage(): Promise<React.ReactElement> {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")

  const plans = await getAllPlansAdmin()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card shrink-0">
        <Link
          href="/super-admin/organizations"
          className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Organizações
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Nova Organização</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <CreateOrgForm plans={plans.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
    </div>
  )
}
