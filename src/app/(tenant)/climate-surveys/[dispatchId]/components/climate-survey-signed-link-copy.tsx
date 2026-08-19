"use client"

import { useState } from "react"
import { Copy, Check, Link2 } from "lucide-react"

interface ClimateSurveySignedLinkCopyProps {
  signedLink: string
}

export function ClimateSurveySignedLinkCopy({ signedLink }: ClimateSurveySignedLinkCopyProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  function handleCopy(): void {
    void navigator.clipboard.writeText(signedLink).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false) }, 2000)
    })
  }

  return (
    <div className="border border-border bg-card">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Link de acesso à pesquisa
        </p>
      </div>
      <div className="px-5 py-3 flex items-center gap-3">
        <p className="text-xs text-muted-foreground flex-1 truncate font-mono">{signedLink}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 min-h-11 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors shrink-0 px-2"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-status-success" />
              <span className="text-status-success">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar link</span>
            </>
          )}
        </button>
      </div>
      <div className="px-5 pb-3">
        <p className="text-[10px] text-muted-foreground">
          Compartilhe este link com os colaboradores. Eles precisarão informar o telefone ou documento para acessar a pesquisa.
        </p>
      </div>
    </div>
  )
}
