import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/modules/auth/session"
import { getActionPlans } from "@/modules/action-plans/action-plan.service"
import { getActionPlanSuggestions } from "@/modules/action-plans/action-plan-suggestions"
import { SuggestionCards } from "@/app/(tenant)/action-plans/suggestion-cards"
import { PageHelp } from "@/components/page-help"

const PLAN_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"

const PLAN_STATUS_STYLE: Record<string, string> = {
  open: BADGE_DEFAULT,
  in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
}

const PLAN_PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}

const PLAN_PRIORITY_STYLE: Record<string, string> = {
  low: BADGE_DEFAULT,
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-destructive/10 text-destructive border-destructive/20",
}

export default async function ActionPlansPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [plans, suggestions] = await Promise.all([
    getActionPlans(session.tenantId),
    getActionPlanSuggestions(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Planos de Acao</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que são planos de ação?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Documento formal que registra as medidas adotadas pela empresa diante de um problema identificado — seja um alerta de queda de índice, um relato anônimo ou uma revisão periódica. São a <strong>prova de que a empresa agiu</strong> ao identificar um risco psicossocial.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Por que documentar?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">A <strong>NR-1</strong> exige não apenas monitorar os riscos, mas <strong>controlar e mitigar</strong> os identificados. Sem planos de ação documentados, a empresa pode ser autuada mesmo que tenha tomado medidas — se não há registro, para o fiscal não aconteceu.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ciclo de vida</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>🔵 <strong>Aberto</strong> — problema identificado, ações ainda não iniciadas</li>
                    <li>🟡 <strong>Em andamento</strong> — medidas sendo executadas</li>
                    <li>🟢 <strong>Concluído</strong> — ações implementadas e situação normalizada</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Como criar</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Clique em <strong>Novo plano</strong>, vincule ao alerta ou relato correspondente, defina as tarefas com responsável e prazo. Os planos são incluídos automaticamente no relatório do PGR do período.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{plans.length} planos</p>
        </div>
        <Link href="/action-plans/new" className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border border-primary" style={{ borderRadius: 0 }}>Novo Plano</Link>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <SuggestionCards suggestions={suggestions} />
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Titulo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tarefas</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum plano de acao.</td></tr>
              )}
              {plans.map((plan, i) => (
                <tr key={plan.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium text-xs">{plan.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${PLAN_PRIORITY_STYLE[plan.priority] ?? BADGE_DEFAULT}`}>
                      {PLAN_PRIORITY_LABELS[plan.priority] ?? plan.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${PLAN_STATUS_STYLE[plan.status] ?? BADGE_DEFAULT}`}>
                      {PLAN_STATUS_LABELS[plan.status] ?? plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{plan.tasks.length}</td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/action-plans/${plan.id}`} className="block">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
