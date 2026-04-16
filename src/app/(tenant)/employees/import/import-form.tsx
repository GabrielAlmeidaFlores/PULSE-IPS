"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react"
import { importEmployeesAction } from "@/app/(tenant)/employees/import/actions"

const _inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

function downloadSampleCsv(): void {
  const rows = [
    ["Nome", "Telefone", "Departamento", "Email"],
    ["João Silva", "11999990001", "Operações", "joao@empresa.com"],
    ["Maria Souza", "11999990002", "RH", ""],
    ["Carlos Lima", "11999990003", "Operações", "carlos@empresa.com"],
  ]
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([`\uFEFF${  csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "modelo-colaboradores.csv"
  a.click()
  URL.revokeObjectURL(url)
}

interface ImportError { row: number; error: string }
interface Result { created: number; failed: number; errors: ImportError[] }

export function ImportEmployeesForm(): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleFileChange(): void {
    const file = inputRef.current?.files?.[0]
    if (file) { setFileName(file.name); setResult(null) }
  }

  function handleSubmit(): void {
    const file = inputRef.current?.files?.[0]
    if (!file) { toast.error("Selecione um arquivo primeiro"); return }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await importEmployeesAction(formData)

      if (res.error) { toast.error(res.error); return }

      setResult({ created: res.created ?? 0, failed: res.failed ?? 0, errors: res.errors ?? [] })

      if ((res.created ?? 0) > 0) {
        toast.success(`${res.created} colaborador(es) importado(s)`)
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-xl space-y-4">

      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2.5 border-b border-border bg-muted">
          <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Instruções</span>
          <button
            onClick={downloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Download className="h-3 w-3" />
            Baixar modelo CSV
          </button>
        </div>
        <div className="px-4 py-3 space-y-1.5 text-[12px] text-muted-foreground">
          <p>Envie um arquivo <span className="font-bold text-foreground">.xlsx</span> ou <span className="font-bold text-foreground">.csv</span> com as colunas abaixo:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {[
              ["Nome", "Obrigatório"],
              ["Telefone", "Obrigatório"],
              ["Departamento", "Obrigatório — deve existir no sistema"],
              ["Email", "Opcional"],
            ].map(([col, desc]) => (
              <div key={col} className="contents">
                <span className="font-mono font-bold text-foreground text-[11px]">{col}</span>
                <span className="text-[11px]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2.5 border-b border-border bg-muted">
          <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Arquivo</span>
        </div>
        <div className="p-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary transition-colors py-8 bg-background"
            style={{ borderRadius: 0 }}
          >
            <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
            {fileName ? (
              <span className="text-[13px] font-bold text-foreground">{fileName}</span>
            ) : (
              <span className="text-[12px] text-muted-foreground">Clique para selecionar o arquivo</span>
            )}
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase">.xlsx · .xls · .csv</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!fileName || isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
        style={{ borderRadius: 0 }}
      >
        <Upload className="h-3.5 w-3.5" />
        {isPending ? "Importando..." : "Importar colaboradores"}
      </button>

      {result && (
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2.5 border-b border-border bg-muted">
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Resultado</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-[13px] font-bold text-foreground">{result.created} importados</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-[13px] font-bold text-destructive">{result.failed} com erro</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="border border-destructive/20 bg-destructive/5 divide-y divide-destructive/10" style={{ borderRadius: 0 }}>
                {result.errors.map((e) => (
                  <div key={e.row} className="px-3 py-2 flex gap-3 text-[11px]">
                    <span className="font-mono font-bold text-muted-foreground shrink-0">Linha {e.row}</span>
                    <span className="text-destructive">{e.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
