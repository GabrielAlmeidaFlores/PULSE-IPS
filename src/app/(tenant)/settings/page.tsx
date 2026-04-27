import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getOrgUsers } from "@/modules/auth/invite.service"
import { SettingsForm } from "@/app/(tenant)/settings/settings-form"
import { TeamManagement } from "@/app/(tenant)/settings/team-management"
import { ChangePasswordForm } from "@/app/(tenant)/settings/change-password-form"
import { ThemeSettings } from "@/app/(tenant)/settings/theme-settings"
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
          <h1 className="text-sm font-bold uppercase tracking-widest">Configurações</h1>
          <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Configurações da organização</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Dados gerais da sua empresa no Pulse. Alterações aqui afetam o comportamento de toda a plataforma — especialmente o <strong>fuso horário</strong>, que impacta diretamente o horário de envio das pesquisas. Disponível apenas para o administrador.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fuso horário — crítico</p>
                  <p className="text-[12px] text-foreground leading-relaxed">O Pulse armazena todos os dados em UTC internamente, mas usa o fuso da organização para calcular o momento correto de envio. Se configurado errado, as pesquisas serão enviadas <strong>fora do expediente</strong> dos colaboradores.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Equipe</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Convide membros da equipe de RH para acessar o painel. O perfil <strong>RH</strong> pode visualizar dados, gerenciar colaboradores e tratar relatos, mas não pode excluir registros sensíveis nem acessar configurações de billing.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Slug da organização</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Identificador único da sua empresa na URL de login (ex: <code className="bg-muted px-1 text-[11px]">pulse.com/login?org=suaempresa</code>). Compartilhe com os membros da equipe para facilitar o acesso.</p>
                </div>
              </div>
            } />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Dados da organização</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card max-w-lg">
          <div className="border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest">Organização</span>
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
        <div className="mt-6">
          <ThemeSettings />
        </div>
      </div>
    </div>
  )
}
