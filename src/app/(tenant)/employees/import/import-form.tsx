"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Upload, Download, FileSpreadsheet } from "lucide-react"
import { previewImportAction } from "@/app/(tenant)/employees/import/actions"

const PREVIEW_STORAGE_KEY = "pulse:import-preview"

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

export function ImportEmployeesForm(): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleFileChange(): void {
    const file = inputRef.current?.files?.[0]
    if (file) setFileName(file.name)
  }

  function handleSubmit(): void {
    const file = inputRef.current?.files?.[0]
    if (!file) { toast.error("Selecione um arquivo primeiro"); return }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await previewImportAction(formData)

      if (res.error) { toast.error(res.error); return }

      sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(res.preview))
      router.push("/employees/import/preview")
    })
  }

  return (
    <div className="max-w-xl space-y-4">

      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2.5 border-b border-border bg-muted flex items-center justify-between">
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
              ["Telefone", "Obrigatório — ex: +5511999999999"],
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
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary transition-colors py-8 bg-background cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
            {fileName !== null ? (
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
        disabled={fileName === null || isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
        style={{ borderRadius: 0 }}
      >
        <Upload className="h-3.5 w-3.5" />
        {isPending ? "Analisando..." : "Pré-visualizar importação"}
      </button>
    </div>
  )
}
