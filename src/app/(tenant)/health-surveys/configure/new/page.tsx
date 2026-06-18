import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { HealthSurveyConfigForm } from "@/app/(tenant)/health-surveys/configure/health-survey-config-form"
import { createHealthSurveyConfigAction } from "@/app/(tenant)/health-surveys/configure/new/actions"

export default async function NewHealthSurveyConfigPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const departments = await getActiveDepartments(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/health-surveys/configure" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Configurar</Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Nova Pesquisa</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure uma nova pesquisa de saúde ocupacional</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <HealthSurveyConfigForm
          mode="create"
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          onSubmit={createHealthSurveyConfigAction}
          cancelHref="/health-surveys/configure"
        />
      </div>
    </div>
  )
}
