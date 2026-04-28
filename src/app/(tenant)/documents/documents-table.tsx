"use client"

import { useState } from "react"
import { Upload, History } from "lucide-react"
import { TablePagination } from "@/libs/design-system"
import { DocumentVersionModal } from "@/app/(tenant)/documents/document-version-modal"
import { DocumentVersionsHistoryModal } from "@/app/(tenant)/documents/document-versions-history-modal"

interface DocumentVersion {
  id: string
  version: number
  fileUrl: string
  uploadedBy: string
  createdAt: Date
}

interface DocumentRow {
  id: string
  title: string
  type: string
  fileUrl: string | null
  versions: DocumentVersion[]
}

interface Props {
  documents: DocumentRow[]
  total: number
}

const TYPE_LABELS: Record<string, string> = {
  policy: "Política",
  procedure: "Procedimento",
  pgr: "PGR",
  pcmso: "PCMSO",
  other: "Outro",
}

export function DocumentsTable({ documents, total }: Props): React.ReactElement {
  const [versionDoc, setVersionDoc] = useState<{ id: string; title: string } | null>(null)
  const [historyDoc, setHistoryDoc] = useState<{ id: string; title: string } | null>(null)

  return (
    <>
      <div className="border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Título
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Tipo
              </th>
              <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Versão
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Nenhum documento.
                </td>
              </tr>
            )}
            {documents.map((doc, i) => {
              const latestVersion = doc.versions[0]
              const hasFile = Boolean(latestVersion?.fileUrl ?? doc.fileUrl)

              return (
                <tr
                  key={doc.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-3 font-medium">{doc.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground bg-muted">
                      {TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {latestVersion ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/40 text-primary bg-primary/5">
                        v{latestVersion.version}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {hasFile && (
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => setHistoryDoc({ id: doc.id, title: doc.title })}
                        title="Ver histórico de versões"
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        style={{ borderRadius: 0 }}
                      >
                        <History size={13} />
                      </button>
                      <button
                        onClick={() => setVersionDoc({ id: doc.id, title: doc.title })}
                        title="Enviar nova versão"
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        style={{ borderRadius: 0 }}
                      >
                        <Upload size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <TablePagination total={total} />

      {versionDoc && (
        <DocumentVersionModal
          document={versionDoc}
          open={true}
          onClose={() => setVersionDoc(null)}
        />
      )}

      {historyDoc && (
        <DocumentVersionsHistoryModal
          document={historyDoc}
          open={true}
          onClose={() => setHistoryDoc(null)}
        />
      )}
    </>
  )
}
