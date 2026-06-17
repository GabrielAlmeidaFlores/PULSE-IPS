import { CreatePlanForm } from "@/app/(super-admin)/super-admin/plans/new/create-plan-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewPlanPage(): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card shrink-0">
        <Link
          href="/super-admin/plans"
          className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Planos
        </Link>
        <div className="h-4 w-px bg-border" />
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Novo Plano</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <CreatePlanForm />
      </div>
    </div>
  )
}

