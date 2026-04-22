import { getAllOrganizations } from "@/modules/organizations/organization.service"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

const BILLING_LABELS: Record<string, string> = {
  active:    "Ativo",
  pending:   "Pendente",
  past_due:  "Em atraso",
  suspended: "Suspenso",
  cancelled: "Cancelado",
}

const BILLING_CLASSES: Record<string, string> = {
  active:    "admin-bg-green admin-accent-green",
  pending:   "admin-bg-amber admin-accent-amber",
  past_due:  "admin-bg-red admin-accent-red",
  suspended: "admin-bg-red admin-accent-red",
  cancelled: "bg-muted text-muted-foreground",
}

function BillingBadge({ status }: { status: string }): React.ReactElement {
  const cls = BILLING_CLASSES[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${cls}`} style={{ borderRadius: 0 }}>
      {BILLING_LABELS[status] ?? status}
    </span>
  )
}

export default async function OrganizationsPage(): Promise<React.ReactElement> {
  const orgs = await getAllOrganizations()

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-card shrink-0">
        <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Organizações</h1>
        <p className="text-[11px] text-muted-foreground">
          {orgs.length} organização{orgs.length !== 1 ? "s" : ""} cadastrada{orgs.length !== 1 ? "s" : ""} — criadas via checkout pelos clientes
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Organização</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden md:table-cell">Plano</th>
                <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Billing</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden sm:table-cell">Colaboradores</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-[11px] tracking-wide">
                    Nenhuma organização ainda. Clientes criam suas contas via checkout na landing page.
                  </td>
                </tr>
              )}
              {orgs.map((org, i) => (
                <tr
                  key={org.id}
                  className={`border-b border-border last:border-0 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                >
                  <td colSpan={6} className="p-0">
                    <Link
                      href={`/super-admin/organizations/${org.id}`}
                      className="flex items-center w-full hover:bg-primary/5 transition-colors"
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex-1 flex items-center min-w-0">
                        <div className="px-4 py-3 min-w-0 flex-1">
                          <div className="font-semibold text-foreground truncate">{org.name}</div>
                        </div>
                        <div className="px-4 py-3 font-mono text-muted-foreground hidden sm:block w-36 shrink-0">
                          {org.slug}
                        </div>
                        <div className="px-4 py-3 text-muted-foreground hidden md:block w-36 shrink-0">
                          {(org as { plan?: { name: string } | null }).plan?.name ?? "—"}
                        </div>
                        <div className="px-4 py-3 flex justify-center w-28 shrink-0">
                          <BillingBadge status={org.billingStatus} />
                        </div>
                        <div className="px-4 py-3 font-mono text-right text-muted-foreground hidden sm:block w-24 shrink-0">
                          {(org as { _count?: { employees?: number } })._count?.employees ?? 0}
                        </div>
                      </div>
                      <div className="px-4 py-3 text-muted-foreground shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orgs.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <span className="text-[10px] text-muted-foreground">{orgs.length} registros</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
