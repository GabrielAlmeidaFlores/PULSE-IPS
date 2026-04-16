import { getAllOrganizations } from "@/modules/organizations/organization.service"
import Link from "next/link"

function BillingBadge({ status }: { status: string }): React.ReactElement {
  const map: Record<string, string> = {
    active:   "admin-bg-green admin-accent-green",
    pending:  "admin-bg-amber admin-accent-amber",
    canceled: "admin-bg-red admin-accent-red",
    inactive: "bg-muted text-muted-foreground",
  }
  const cls = map[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${cls}`} style={{ borderRadius: 0 }}>
      {status}
    </span>
  )
}

export default async function OrganizationsPage(): Promise<React.ReactElement> {
  const orgs = await getAllOrganizations()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Organizações</h1>
          <p className="text-[11px] text-muted-foreground">
            {orgs.length} organizações cadastradas — criadas via checkout pelos clientes
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Organização</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Plano</th>
                <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Billing</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Colaboradores</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Ações</th>
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
                <tr key={org.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-foreground">{org.name}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{org.slug}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(org as { plan?: { name: string } | null }).plan?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <BillingBadge status={org.billingStatus} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {(org as { _count?: { employees?: number } })._count?.employees ?? 0}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0">
                      <Link
                        href={`/super-admin/organizations/${org.id}`}
                        className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        style={{ borderRadius: 0 }}
                      >
                        Detalhes
                      </Link>
                      <Link
                        href={`/super-admin/organizations/${org.id}/billing`}
                        className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-border border-l-0 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        style={{ borderRadius: 0 }}
                      >
                        Billing
                      </Link>
                    </div>
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
