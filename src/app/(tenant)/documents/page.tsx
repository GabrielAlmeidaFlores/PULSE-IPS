import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDocuments } from "@/modules/documents/document.service"
import { AddDocumentForm } from "@/app/(tenant)/documents/add-document-form"
import { DocumentsTable } from "@/app/(tenant)/documents/documents-table"
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
        <DocumentsTable documents={documents} />
      </div>
    </div>
  )
}
