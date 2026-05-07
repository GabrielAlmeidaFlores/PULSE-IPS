import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getHealthSurveyConfigGroup } from "@/modules/health-surveys/health-survey-config.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { EditHealthSurveyConfigForm } from "@/app/(tenant)/health-surveys/configure/[configId]/edit-health-survey-config-form"

interface Props {
  params: Promise<{ configId: string }>
}

export default async function EditHealthSurveyConfigPage({ params }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { configId } = await params
  const [group, departments] = await Promise.all([
    getHealthSurveyConfigGroup(session.tenantId, configId),
    getActiveDepartments(session.tenantId),
  ])
  if (group?.representative === undefined || group.representative === null) notFound()

  const { representative: config, allDeptIds } = group

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/health-surveys/configure" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Configurar</Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Editar Pesquisa</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{config.name}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <EditHealthSurveyConfigForm
          configId={configId}
          initialConfig={config}
          initialDeptIds={allDeptIds}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </div>
  )
}
