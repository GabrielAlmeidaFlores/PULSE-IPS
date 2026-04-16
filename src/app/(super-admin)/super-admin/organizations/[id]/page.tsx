import { getOrganizationForAdmin } from "@/modules/organizations/organization.service"
import Link from "next/link"
import { ArrowLeft, Building2, Users, Layers, CreditCard } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{label}</span>
      <span className="text-[12px] font-semibold text-foreground">{value}</span>
    </div>
  )
}

function StatusBadge({ value, active }: { value: string; active: boolean }): React.ReactElement {
  return (
    <span
      className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${active ? "admin-bg-green admin-accent-green" : "admin-bg-amber admin-accent-amber"}`}
      style={{ borderRadius: 0 }}
    >
      {value}
    </span>
  )
}

function SectionBlock({ icon, title, children }: { icon: React.ReactElement; title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-muted">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] font-black tracking-widest uppercase text-foreground">{title}</span>
      </div>
      {children}
    </div>
  )
}

export default async function OrganizationDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params
  const org = await getOrganizationForAdmin(id)

  if (!org) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-3 border-b border-border bg-card">
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Organização não encontrada</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card shrink-0">
        <Link
          href="/super-admin/organizations"
          className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Organizações
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex-1">
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">{org.name}</h1>
          <p className="text-[11px] font-mono text-muted-foreground">{org.slug}</p>
        </div>
        <Link
          href={`/super-admin/organizations/${id}/billing`}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
          style={{ borderRadius: 0 }}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Billing
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionBlock icon={<Building2 className="h-4 w-4" />} title="Dados da Organização">
            <DetailRow label="Nome" value={org.name} />
            <DetailRow label="Slug" value={<span className="font-mono">{org.slug}</span>} />
            <DetailRow label="Timezone" value={org.timezone} />
            <DetailRow label="Plano" value={org.plan?.name ?? "—"} />
            <DetailRow
              label="Billing"
              value={<StatusBadge value={org.billingStatus} active={org.billingStatus === "active"} />}
            />
            <DetailRow
              label="Ativo"
              value={<StatusBadge value={org.isActive ? "sim" : "não"} active={org.isActive} />}
            />
          </SectionBlock>

          <SectionBlock icon={<Users className="h-4 w-4" />} title="Headcount">
            <DetailRow
              label="Colaboradores"
              value={<span className="font-mono admin-accent-blue">{(org as { _count: { employees: number } })._count.employees}</span>}
            />
            <DetailRow
              label="Departamentos"
              value={<span className="font-mono">{(org as { _count: { departments: number } })._count.departments}</span>}
            />
            {org.maxEmployeesOverride !== null && (
              <DetailRow
                label="Limite (override)"
                value={<span className="font-mono admin-accent-amber">{org.maxEmployeesOverride}</span>}
              />
            )}
          </SectionBlock>

          {org.subscription && (
            <SectionBlock icon={<Layers className="h-4 w-4" />} title="Assinatura Ativa">
              <DetailRow label="Plano" value={org.subscription.snapshotPlanName} />
              <DetailRow
                label="Status"
                value={<StatusBadge value={org.subscription.status} active={org.subscription.status === "active"} />}
              />
              <DetailRow label="Max. colaboradores" value={<span className="font-mono">{org.subscription.snapshotMaxEmployees}</span>} />
              <DetailRow
                label="Preço"
                value={
                  <span className="font-mono admin-accent-green">
                    {(org.subscription.snapshotPriceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/{org.subscription.snapshotInterval}
                  </span>
                }
              />
              <DetailRow
                label="Cancela ao fim"
                value={<StatusBadge value={org.subscription.cancelAtPeriodEnd ? "sim" : "não"} active={!org.subscription.cancelAtPeriodEnd} />}
              />
            </SectionBlock>
          )}
        </div>
      </div>
    </div>
  )
}

