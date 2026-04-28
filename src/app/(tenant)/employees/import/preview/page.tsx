"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Upload } from "lucide-react"
import { toast } from "sonner"
import { confirmImportAction } from "@/app/(tenant)/employees/import/actions"
import type { ImportPreview, ImportPreviewItem } from "@/modules/employees/employee.types"

const PREVIEW_STORAGE_KEY = "pulse:import-preview"

function readPreviewFromStorage(): ImportPreview | null {
  if (typeof window === "undefined") return null
  const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as ImportPreview
  } catch {
    return null
  }
}

export default function ImportPreviewPage(): React.ReactElement {
  const [preview] = useState<ImportPreview | null>(readPreviewFromStorage)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (preview === null) router.replace("/employees/import")
  }, [preview, router])

  function handleConfirm(): void {
    if (!preview) return
    const validItems: ImportPreviewItem[] = preview.items.filter((item) => item.valid)

    startTransition(async () => {
      const res = await confirmImportAction(validItems)

      if (res.error) {
        toast.error(res.error)
        return
      }

      sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
      toast.success(`${res.created ?? 0} colaborador(es) importado(s)`)
      router.push("/employees")
    })
  }

  function handleCancel(): void {
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
    router.push("/employees/import")
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[12px] text-muted-foreground">Carregando prévia...</span>
      </div>
    )
  }

  const validCount = preview.items.filter((item) => item.valid).length

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Prévia da Importação</h1>
          <p className="text-[11px] text-muted-foreground">
            Verifique os dados antes de confirmar
          </p>
        </div>
        <div className="flex items-center gap-0">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-[11px] font-bold tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ borderRadius: 0 }}
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending || validCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 transition-colors border border-primary"
            style={{ borderRadius: 0 }}
          >
            <Upload className="h-3.5 w-3.5" />
            {isPending ? "Importando..." : `Confirmar (${validCount} válidos)`}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-status-success" />
            <span className="text-[13px] font-bold text-foreground">{preview.valid} válidos</span>
          </div>
          {preview.invalid > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-[13px] font-bold text-destructive">{preview.invalid} com erro</span>
            </div>
          )}
        </div>

        <div className="border border-border bg-card">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Linha</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Telefone</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Departamento</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">E-mail</th>
                <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.items.map((item) => (
                <tr
                  key={item.row}
                  className={`border-b border-border last:border-0 ${item.valid ? "hover:bg-muted/30" : "bg-destructive/5"}`}
                >
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.row}</td>
                  <td className="px-4 py-2.5 text-foreground">{item.name}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.phone}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.departmentName}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    {item.valid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-status-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Válido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive" title={item.errors.join(", ")}>
                        <XCircle className="h-3.5 w-3.5" />
                        {item.errors[0] ?? "Erro"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2">
            <span className="text-[10px] text-muted-foreground">{preview.items.length} linhas processadas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
