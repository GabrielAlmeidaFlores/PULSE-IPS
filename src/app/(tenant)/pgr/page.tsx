import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getPgrReviews } from "@/modules/pgr/pgr.service"
import { format } from "date-fns"
import { PgrGenerateButton } from "@/app/(tenant)/pgr/pgr-generate-button"
import { PageHelp } from "@/components/page-help"

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
            <PageHelp text="Programa de Gerenciamento de Riscos exigido pela NR-1. Gera relatórios periódicos do estado de saúde emocional da empresa com base nas respostas das pesquisas. Selecione o período (mês/ano) e gere o relatório para fins de conformidade legal e auditoria trabalhista." />
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
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gerado em</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma revisao PGR.</td></tr>
              )}
              {reviews.map((review, i) => (
                <tr key={review.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs">{review.period}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground bg-muted">
                      {review.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {review.reviewedAt ? format(review.reviewedAt, "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {review.fileUrl ? (
                      <a href={review.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs font-medium">Download</a>
                    ) : "—"}
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
