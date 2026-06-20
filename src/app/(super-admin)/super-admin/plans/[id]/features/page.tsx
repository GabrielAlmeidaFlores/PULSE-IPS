import { getPlan } from "@/modules/plans/plan.service"
import { notFound } from "next/navigation"
import { PlanFeaturesForm } from "@/app/(super-admin)/super-admin/plans/[id]/features/plan-features-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface PlanFeaturesPageProps {
  params: Promise<{ id: string }>
}

export default async function PlanFeaturesPage({ params }: PlanFeaturesPageProps): Promise<React.ReactElement> {
  const { id } = await params
  const plan = await getPlan(id)
  if (!plan) notFound()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card shrink-0">
        <Link
          href="/super-admin/plans"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Funcionalidades do Plano</h1>
          <p className="text-[11px] text-muted-foreground">{plan.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <PlanFeaturesForm planId={plan.id} currentFeatures={plan.features} />
      </div>
    </div>
  )
}
