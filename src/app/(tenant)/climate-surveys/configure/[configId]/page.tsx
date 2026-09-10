import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getClimateSurveyConfig } from "@/modules/climate-surveys/climate-survey-config.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { listClimateSurveyTopicOptions } from "@/modules/climate-surveys/climate-survey-topic.service"
import { EditClimateSurveyConfigForm } from "@/app/(tenant)/climate-surveys/configure/[configId]/edit-climate-survey-config-form"

interface Props {
  params: Promise<{ configId: string }>
}

export default async function EditClimateSurveyConfigPage({ params }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const { configId } = await params
  const [config, departments, topics] = await Promise.all([
    getClimateSurveyConfig(session.tenantId, configId),
    getActiveDepartments(session.tenantId),
    listClimateSurveyTopicOptions(session.tenantId),
  ])
  if (!config) notFound()

  const initialDeptIds = config.configDepartments.map((cd) => cd.department.id)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/climate-surveys/configure" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Banco de Perguntas</Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Editar Pesquisa</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{config.name}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <EditClimateSurveyConfigForm
          configId={configId}
          initialConfig={config}
          initialDeptIds={initialDeptIds}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          topics={topics}
        />
      </div>
    </div>
  )
}
