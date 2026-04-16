import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDocuments } from "@/modules/documents/document.service"
import { AddDocumentForm } from "@/app/(tenant)/documents/add-document-form"
import { PageHelp } from "@/components/page-help"

export default async function DocumentsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const documents = await getDocuments(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Documentos</h1>
            <PageHelp text="Repositório de documentos da empresa — laudos, NRs, políticas internas e outros arquivos relevantes. Cada documento pode ter múltiplas versões, mantendo o histórico completo de atualizações. Os documentos ficam disponíveis para consulta interna da equipe." />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{documents.length} documentos</p>
        </div>
        <AddDocumentForm />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Titulo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Versoes</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum documento.</td></tr>
              )}
              {documents.map((doc, i) => (
                <tr key={doc.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{doc.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground bg-muted">
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{doc.versions.length}</td>
                  <td className="px-4 py-3 text-right">
                    {doc.fileUrl ? (
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs font-medium">
                        Download
                      </a>
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
