import { getAllTermsVersions } from "@/modules/terms/terms.service"
import { NewTermsVersionForm } from "@/app/(super-admin)/super-admin/terms/new-terms-version-form"
import { FileText, CheckCircle, Clock } from "lucide-react"

export default async function TermsPage(): Promise<React.ReactElement> {
  const versions = await getAllTermsVersions()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Termos de Uso</h1>
          <p className="text-[11px] text-muted-foreground">{versions.length} versão(ões) publicada(s)</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Versões publicadas</h2>
            {versions.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Nenhuma versão criada ainda.</p>
            )}
            {versions.map((v) => (
              <div key={v.id} className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{v.title}</p>
                      <p className="text-[11px] text-muted-foreground">Versão {v.version}</p>
                    </div>
                  </div>
                  {v.isActive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 shrink-0">
                      <CheckCircle className="h-3 w-3" /> Ativa
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground bg-muted border border-border px-2 py-0.5 shrink-0">
                      <Clock className="h-3 w-3" /> Inativa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Vigência: {new Date(v.effectiveAt).toLocaleDateString("pt-BR")} · Criado em{" "}
                  {new Date(v.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>

          <NewTermsVersionForm />
        </div>
      </div>
    </div>
  )
}
