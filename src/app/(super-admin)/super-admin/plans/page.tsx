import { getAllPlansPaginated } from "@/modules/plans/plan.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { PLAN_FEATURE_LABELS } from "@/modules/plans/plan.types"
import Link from "next/link"
import { Plus } from "lucide-react"
import { TablePagination } from "@/libs/design-system"
import { PlanRowActions } from "@/app/(super-admin)/super-admin/plans/plan-row-actions"

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}): Promise<React.ReactElement> {
  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  const { items: plans, total } = await getAllPlansPaginated({ page, pageSize })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Planos</h1>
          <p className="text-[11px] text-muted-foreground">{total} planos configurados</p>
        </div>
        <Link
          href="/super-admin/plans/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/90 transition-colors"
          style={{ borderRadius: 0 }}
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Plano
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="border border-border bg-card">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Plano</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Funcionalidades</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Max. Colaboradores</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Preços</th>
                <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-[11px] tracking-wide">
                    Nenhum plano cadastrado ainda.
                  </td>
                </tr>
              )}
              {plans.map((plan, i) => (
                <tr key={plan.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-foreground">{plan.name}</div>
                    {plan.description && (
                      <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{plan.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {plan.features.length === 0 && <span className="text-muted-foreground">—</span>}
                      {plan.features.map((feature) => (
                        <span
                          key={feature}
                          className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 admin-bg-green admin-accent-green"
                          style={{ borderRadius: 0 }}
                        >
                          {PLAN_FEATURE_LABELS[feature]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {plan.maxEmployees !== null ? plan.maxEmployees.toLocaleString("pt-BR") : "Ilimitado"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {plan.prices.length === 0 && <span className="text-muted-foreground">—</span>}
                      {plan.prices.map((p) => (
                        <span key={p.id} className="font-mono admin-accent-green text-[11px]">
                          {formatBRL(p.priceInCents)}/{p.interval}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${plan.isActive ? "admin-bg-green admin-accent-green" : "bg-muted text-muted-foreground"}`}
                      style={{ borderRadius: 0 }}
                    >
                      {plan.isActive ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <PlanRowActions plan={plan} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination total={total} />
      </div>
    </div>
  )
}
