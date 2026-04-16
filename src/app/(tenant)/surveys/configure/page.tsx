import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDepartments } from "@/modules/departments/department.service"
import { ConfigureSurveyForm } from "@/app/(tenant)/surveys/configure/configure-survey-form"

export default async function ConfigureSurveyPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const departments = await getDepartments(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Configurar Pesquisa</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Defina as perguntas e o horário de envio por departamento</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ConfigureSurveyForm departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </div>
    </div>
  )
}
