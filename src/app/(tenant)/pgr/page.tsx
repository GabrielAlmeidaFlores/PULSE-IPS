import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/modules/auth/session"
import { getPgrReviews } from "@/modules/pgr/pgr.service"
import { format } from "date-fns"
import { PgrGenerateButton } from "@/app/(tenant)/pgr/pgr-generate-button"
import { PageHelp } from "@/components/page-help"
import { toHealthIndex as _toHealthIndex, healthIndexAccent, healthIndexLabel } from "@/libs/utils/health-index"

const PGR_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  generated: "Gerado",
  reviewed: "Revisado",
}

const PGR_STATUS_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  generated: "bg-primary/10 text-primary border-primary/20",
  reviewed: "bg-green-50 text-green-700 border-green-200",
}

export default async function PgrPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const reviews = await getPgrReviews(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">PGR — Revisoes</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que é o PGR?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">O <strong>Programa de Gerenciamento de Riscos</strong> é exigido pela <strong>NR-1 (atualização de 2025)</strong>, que entrou em vigor em maio de 2026. Toda empresa com funcionários CLT deve identificar, avaliar e controlar riscos ocupacionais — incluindo os <strong>fatores psicossociais</strong> como estresse, sobrecarga e clima organizacional.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Por que é importante?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Empresas sem documentação comprobatória do PGR estão sujeitas a <strong>multas e autuações fiscais</strong>. Em caso de ação trabalhista por dano psicológico, a ausência do PGR agrava a responsabilidade do empregador. O relatório gerado aqui serve como <strong>evidência legal</strong> de que a empresa monitora e age sobre os riscos.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Como funciona aqui?</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>① Clique em <strong>Gerar relatório</strong> e selecione o mês/ano de referência.</li>
                    <li>② O sistema consolida automaticamente as respostas das pesquisas do período: índice de saúde por setor, tendências e alertas.</li>
                    <li>③ Revise o relatório e clique em <strong>Marcar como revisado</strong> para registrar a análise com data e responsável.</li>
                    <li>④ O relatório fica arquivado e pode ser exportado em PDF para o prontuário do PGR a qualquer momento.</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Frequência recomendada</p>
                  <p className="text-[12px] text-foreground leading-relaxed">A NR-1 recomenda revisão <strong>ao menos anual</strong>, mas empresas com histórico de alertas críticos devem revisar <strong>trimestralmente</strong>. O sistema alerta automaticamente 30 dias antes do vencimento da próxima revisão.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} revisoes</p>
        </div>
        <PgrGenerateButton />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Periodo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Índice de saúde</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gerado em</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma revisao PGR.</td></tr>
              )}
              {reviews.map((review, i) => (
                <tr key={review.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs">{review.period}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${PGR_STATUS_STYLE[review.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {PGR_STATUS_LABELS[review.status] ?? review.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {review.overallHealthIndex !== null ? (
                      <span className={`text-sm font-bold ${healthIndexAccent(review.overallHealthIndex)}`}>
                        {review.overallHealthIndex}%
                        <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">{healthIndexLabel(review.overallHealthIndex)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {review.reviewedAt ? format(review.reviewedAt, "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/pgr/${review.id}`} className="block">
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
