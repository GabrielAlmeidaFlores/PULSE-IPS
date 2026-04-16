"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface Props {
  orgSlug: string
}

export function CopyReportLink({ orgSlug }: Props): React.ReactElement {
  const [copied, setCopied] = useState(false)

  function handleCopy(): void {
    const url = `${window.location.origin}/report/${orgSlug}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      style={{ borderRadius: 0 }}
      className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
      {copied ? "Copiado!" : "Copiar link de relatos"}
    </button>
  )
}
