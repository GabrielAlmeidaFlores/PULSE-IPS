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
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Para que serve?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Repositório centralizado de documentos relacionados à saúde ocupacional: laudos médicos, NRs aplicáveis à empresa, políticas internas, resultados de avaliações de risco, PCMSO e outros arquivos de conformidade.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Versionamento</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Cada edição de um documento cria uma <strong>nova versão</strong>, preservando o histórico completo. Nunca se perde uma versão anterior — ideal para documentos que precisam de audit trail (ex: PCMSO, PGR, políticas de RH).</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vinculação a relatos e alertas</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Um documento pode ser vinculado a um <strong>relato anônimo</strong> ou <strong>alerta</strong> como evidência de resposta da empresa. Isso fortalece a documentação do PGR e demonstra que o problema foi formalmente tratado.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Permissões</p>
                  <p className="text-[12px] text-foreground leading-relaxed"><strong>Admin</strong> pode criar, editar e excluir documentos. <strong>RH</strong> pode criar e visualizar. Exclusões são registradas no log de auditoria e geram uma versão arquivada antes da remoção definitiva.</p>
                </div>
              </div>
            } />
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
