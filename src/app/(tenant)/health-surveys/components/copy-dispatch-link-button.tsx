"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface CopyDispatchLinkButtonProps {
  groupLink: string
}

export function CopyDispatchLinkButton({ groupLink }: CopyDispatchLinkButtonProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    void navigator.clipboard.writeText(groupLink).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false) }, 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar link da pesquisa"
      className="flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors px-1 py-0.5"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-status-success shrink-0" />
          <span className="text-status-success hidden sm:inline">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 shrink-0" />
          <span className="hidden sm:inline">Copiar link</span>
        </>
      )}
    </button>
  )
}
