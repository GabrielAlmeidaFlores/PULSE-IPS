import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getOrgUsers } from "@/modules/auth/invite.service"
import { SettingsForm } from "@/app/(tenant)/settings/settings-form"
import { TeamManagement } from "@/app/(tenant)/settings/team-management"
import { ChangePasswordForm } from "@/app/(tenant)/settings/change-password-form"
import { PageHelp } from "@/components/page-help"

export default async function SettingsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "admin") redirect("/dashboard")

  const [org, users] = await Promise.all([
    getOrganization(session.tenantId),
    getOrgUsers(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-bold uppercase tracking-widest">Configuracoes</h1>
          <PageHelp text="Dados gerais da empresa no Pulse: nome da organização, fuso horário e membros da equipe. O fuso horário é usado para calcular o horário exato de envio das pesquisas. Em 'Equipe' você convida usuários de RH para acessar a plataforma. Disponível apenas para o administrador." />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Dados da organizacao</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card max-w-lg">
          <div className="border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest">Organizacao</span>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "Nome", value: org?.name },
              { label: "Slug", value: org?.slug, mono: true },
              { label: "Timezone", value: org?.timezone },
              { label: "Status billing", value: org?.billingStatus },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{row.label}</span>
                <span className={`text-sm ${  row.mono ? "font-mono" : "font-medium"}`}>{row.value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <SettingsForm name={org?.name ?? ""} timezone={org?.timezone ?? "America/Sao_Paulo"} />
        </div>
        <div className="mt-6">
          <TeamManagement users={users} />
        </div>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}
