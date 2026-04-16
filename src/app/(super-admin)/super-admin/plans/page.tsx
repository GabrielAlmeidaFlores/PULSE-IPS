import { getAllPlansAdmin } from "@/modules/plans/plan.service"
import Link from "next/link"
import { Plus } from "lucide-react"
import { PlanRowActions } from "@/app/(super-admin)/super-admin/plans/plan-row-actions"

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function PlansPage(): Promise<React.ReactElement> {
  const plans = await getAllPlansAdmin()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Planos</h1>
          <p className="text-[11px] text-muted-foreground">{plans.length} planos configurados</p>
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Plano</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Descrição</th>
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
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[200px]">
                    <span className="line-clamp-1">{plan.description ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {plan.maxEmployees >= 99999 ? "Ilimitado" : plan.maxEmployees.toLocaleString("pt-BR")}
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
          {plans.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <span className="text-[10px] text-muted-foreground">{plans.length} planos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
