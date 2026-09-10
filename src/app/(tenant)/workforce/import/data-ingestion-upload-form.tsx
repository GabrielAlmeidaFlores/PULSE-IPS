"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { uploadDataIngestionFileAction } from "@/app/(tenant)/workforce/import/actions"

const INPUT_CLASS =
  "w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

function currentCompetencia(): string {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${String(now.getUTCFullYear())}-${month}`
}

export function DataIngestionUploadForm(): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [competencia, setCompetencia] = useState(currentCompetencia())

  function handleSubmit(): void {
    if (file === null) {
      toast.error("Selecione um arquivo.")
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set("file", file)
      formData.set("competencia", competencia)
      const result = await uploadDataIngestionFileAction(formData)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      setFile(null)
      toast.success("Arquivo enviado. O processamento foi iniciado.")
      router.refresh()
    })
  }

  return (
    <div className="border border-border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Competência
          </label>
          <input
            type="month"
            value={competencia}
            onChange={(event) => { setCompetencia(event.target.value) }}
            className={INPUT_CLASS}
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Arquivo (.txt ou .csv)
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(event) => { setFile(event.target.files?.[0] ?? null) }}
            className={INPUT_CLASS}
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ borderRadius: 0 }}
      >
        <Upload className="h-3.5 w-3.5" />
        {isPending ? "Enviando..." : "Importar arquivo"}
      </button>
    </div>
  )
}
