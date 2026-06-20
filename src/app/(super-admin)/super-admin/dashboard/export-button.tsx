"use client"

import { Download } from "lucide-react"

export function ExportButton(): React.ReactElement {
  function handleExport(): void {
    window.location.href = "/api/super-admin/export"
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-card text-muted-foreground text-[11px] font-bold tracking-widest uppercase border border-border hover:bg-muted hover:text-foreground transition-colors"
      style={{ borderRadius: 0 }}
      title="Exportar dados da plataforma em CSV"
    >
      <Download className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">Exportar</span>
    </button>
  )
}
