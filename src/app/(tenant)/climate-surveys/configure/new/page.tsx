import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { listClimateSurveyTopicOptions } from "@/modules/climate-surveys/climate-survey-topic.service"
import { ClimateSurveyConfigForm } from "@/app/(tenant)/climate-surveys/configure/climate-survey-config-form"
import { createClimateSurveyConfigAction } from "@/app/(tenant)/climate-surveys/configure/new/actions"

export default async function NewClimateSurveyConfigPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const [departments, topics] = await Promise.all([
    getActiveDepartments(session.tenantId),
    listClimateSurveyTopicOptions(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/climate-surveys/configure" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Banco de Perguntas</Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Nova Pesquisa</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monte o banco de perguntas por tópico, com pré-visualização e tempo estimado
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <ClimateSurveyConfigForm
          mode="create"
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          topics={topics}
          onSubmit={createClimateSurveyConfigAction}
          cancelHref="/climate-surveys/configure"
        />
      </div>
    </div>
  )
}
