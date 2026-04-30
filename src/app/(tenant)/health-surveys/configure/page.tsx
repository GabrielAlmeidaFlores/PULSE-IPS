import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getGlobalHealthSurveyConfig } from "@/modules/health-surveys/health-survey-config.service"
import { ConfigureHealthSurveyForm } from "@/app/(tenant)/health-surveys/configure/configure-health-survey-form"

export default async function ConfigureHealthSurveyPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const existingConfig = await getGlobalHealthSurveyConfig(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Configurar Pesquisa</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Defina as perguntas e o horário de envio para todos os departamentos</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ConfigureHealthSurveyForm initialConfig={existingConfig} />
      </div>
    </div>
  )
}
