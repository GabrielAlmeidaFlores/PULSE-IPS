import { getAllOrganizationsPaginatedAdmin } from "@/modules/organizations/organization.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { FilterBar, TablePagination } from "@/libs/design-system"
import { SetTrialModalButton } from "@/app/(super-admin)/super-admin/organizations/set-trial-modal-button"

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

function TrialBadge({ trialExpiresAt }: { trialExpiresAt: Date | null }): React.ReactElement {
  if (trialExpiresAt === null) return <span className="text-muted-foreground">—</span>

  const isActive = trialExpiresAt > new Date()
  const formatted = trialExpiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })

  if (isActive) {
    return (
      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 badge-success" style={{ borderRadius: 0 }}>
        {formatted}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-muted text-muted-foreground" style={{ borderRadius: 0 }}>
      {formatted}
    </span>
  )
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}): Promise<React.ReactElement> {
  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  const orgQuery: { page: number; pageSize: number; q?: string } = { page, pageSize }
  if (params["q"] !== undefined) orgQuery.q = params["q"]

  const { items: orgs, total } = await getAllOrganizationsPaginatedAdmin(orgQuery)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Organizações</h1>
            <p className="text-[11px] text-muted-foreground">
              {total} organização{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/super-admin/organizations/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-black tracking-widest uppercase hover:bg-primary/90 transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova organização
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <FilterBar
          fields={[{ type: "text", key: "q", label: "Buscar", placeholder: "Nome da organização...", width: "w-[240px]" }]}
          values={{ q: params["q"] }}
        />
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: 720 }}>
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Organização</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden md:table-cell">Plano</th>
                <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Billing</th>
                <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden lg:table-cell">Trial</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden sm:table-cell">Colaboradores</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-[11px] tracking-wide">
                    Nenhuma organização cadastrada.
                  </td>
                </tr>
              )}
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3 font-semibold text-foreground truncate max-w-[180px]">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground hidden sm:table-cell">{org.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{org.plan?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <BillingBadge status={org.billingStatus} />
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <TrialBadge trialExpiresAt={org.trialExpiresAt} />
                      <SetTrialModalButton
                        organizationId={org.id}
                        organizationName={org.name}
                        trialExpiresAt={org.trialExpiresAt}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-muted-foreground hidden sm:table-cell">
                    {org._count.employees}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/super-admin/organizations/${org.id}`} className="block">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <TablePagination total={total} />
      </div>
    </div>
  )
}
