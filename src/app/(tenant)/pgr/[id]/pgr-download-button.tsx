"use client"
import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PgrDownloadButtonProps {
  reviewId: string
}

export function PgrDownloadButton({ reviewId }: PgrDownloadButtonProps): React.ReactElement {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/pgr/${reviewId}/pdf`)

      if (!response.ok) {
        setError("Erro ao gerar PDF. Tente novamente.")
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const contentDisposition = response.headers.get("Content-Disposition") ?? ""
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] ?? `pgr-${reviewId}.pdf`

      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Erro ao gerar PDF. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileDown className="w-3.5 h-3.5" />
        )}
        {loading ? "Gerando PDF..." : "Exportar PDF"}
      </Button>
      {error !== null && (
        <span className="text-[10px] text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  )
}
