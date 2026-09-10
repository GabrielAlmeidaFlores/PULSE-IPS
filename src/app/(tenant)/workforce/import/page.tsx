import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { listDataIngestionBatchesPaginated } from "@/modules/data-ingestion/data-ingestion.service"
import { DataIngestionUploadForm } from "@/app/(tenant)/workforce/import/data-ingestion-upload-form"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { TablePagination } from "@/libs/design-system"
import { BADGE_AMBER, BADGE_BASE, BADGE_BLUE, BADGE_GREEN, BADGE_RED } from "@/libs/design-system/alert-labels"

const STATUS_LABELS: Record<string, string> = {
  received: "Recebido",
  processing: "Processando",
  extracted: "Extraído",
  validated: "Validado",
  failed: "Falhou",
}

const STATUS_STYLES: Record<string, string> = {
  received: BADGE_BLUE,
  processing: BADGE_AMBER,
  extracted: BADGE_BLUE,
  validated: BADGE_GREEN,
  failed: BADGE_RED,
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function DataIngestionImportPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])
  const { items: batches, total } = await listDataIngestionBatchesPaginated(session.tenantId, { page, pageSize })

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/workforce" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Indicadores de Pessoas
        </Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Importar dados</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envie o arquivo de ponto/planilha (.txt ou .csv). A IA extrai e valida os dados automaticamente.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <DataIngestionUploadForm />

        <div className="border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Importações ({total})
            </p>
          </div>
          {batches.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-bold text-muted-foreground">Nenhuma importação ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Envie um arquivo acima para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arquivo</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Competência</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Status</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Registros</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-44">Enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        {batch.fileName}
                        {batch.errorMessage !== null && (
                          <span className="block text-[11px] text-status-danger mt-0.5">{batch.errorMessage}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{batch.competencia}</td>
                      <td className="px-4 py-3">
                        <span className={`${BADGE_BASE} ${STATUS_STYLES[batch.status] ?? BADGE_BLUE}`}>
                          {STATUS_LABELS[batch.status] ?? batch.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{batch.totalRecords}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(batch.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination total={total} />
        </div>
      </div>
    </div>
  )
}
