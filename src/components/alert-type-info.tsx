"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"

interface AlertTypeDetail {
  label: string
  description: string
  action: string
}

const ALERT_DETAILS: Record<string, AlertTypeDetail> = {
  score_drop: {
    label: "Queda no bem-estar",
    description: "O índice de bem-estar ocupacional do setor caiu mais de 1 ponto em relação ao período anterior.",
    action: "Revise as respostas das pesquisas, identifique qual fator piorou e crie um plano de ação para endereçar a causa.",
  },
  low_score: {
    label: "Bem-estar abaixo do esperado",
    description: "O índice de bem-estar ocupacional do setor está abaixo do limiar de atenção (2,5 de 5,0).",
    action: "Investigue a causa raiz, converse com a equipe e elabore um plano de ação para melhorar o clima ocupacional.",
  },
  pgr_review_due: {
    label: "Revisão PGR pendente",
    description: "A próxima revisão obrigatória do PGR (Programa de Gerenciamento de Riscos) vence em até 30 dias.",
    action: "Agende a reunião de revisão com os responsáveis e atualize o documento do PGR dentro do prazo exigido pela NR-1.",
  },
  negative_trend: {
    label: "Tendência de piora persistente",
    description: "O índice de bem-estar do setor ficou abaixo da média histórica por 3 períodos consecutivos — sinal de problema persistente.",
    action: "Situação requer atenção urgente. Revise o contexto da equipe, aplique pesquisas qualitativas e implemente planos de ação estruturados.",
  },
  low_adherence: {
    label: "Adesão baixa",
    description: "Menos de 80% dos colaboradores responderam à pesquisa dentro de 48 horas após o disparo.",
    action: "Lembre os colaboradores de responder, use a função de reenvio ou revise se os canais de comunicação (SMS/WhatsApp) estão funcionando.",
  },
  no_response: {
    label: "Sem resposta",
    description: "Nenhuma resposta foi recebida neste ciclo de pesquisa.",
    action: "Verifique se os colaboradores receberam os links e se os números de telefone estão corretos. Reenvie a pesquisa se necessário.",
  },
  consent_expired: {
    label: "Consentimento expirado",
    description: "O termo de consentimento (TCLE) de um ou mais colaboradores está expirado ou ainda pendente de aceite.",
    action: "Reenvie o convite de consentimento para os colaboradores pendentes para que possam voltar a participar das pesquisas.",
  },
  crisis_report: {
    label: "Relato de crise",
    description: "Um relato anônimo contém palavras-chave associadas a situações de crise (ex: automutilação, ideação suicida).",
    action: "Ative o protocolo de crise imediatamente. Disponibilize apoio psicológico para a equipe. CVV: 188 (gratuito, 24h).",
  },
  billing: {
    label: "Cobrança",
    description: "Há uma pendência relacionada à assinatura ou ao pagamento da conta do plano.",
    action: "Regularize o pagamento junto à equipe financeira antes que o acesso à plataforma seja suspenso.",
  },
  system: {
    label: "Sistema",
    description: "Notificação interna gerada automaticamente pelo sistema.",
    action: "Leia a mensagem do alerta para mais detalhes. Se necessário, entre em contato com o suporte técnico.",
  },
}

interface AlertTypeInfoProps {
  type: string
}

export function AlertTypeInfo({ type }: AlertTypeInfoProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const anchorRect = useRef<DOMRect | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    if (open && tooltipRef.current && anchorRect.current) {
      const tipRect = tooltipRef.current.getBoundingClientRect()
      const anchor = anchorRect.current
      if (tipRect.bottom > window.innerHeight - 8) {
        setPos((prev) => ({ ...prev, top: anchor.top - tipRect.height - 4 }))
      }
    }
  }, [open])

  const detail = ALERT_DETAILS[type]
  if (!detail) return <></>

  function scheduleClose(): void {
    leaveTimer.current = setTimeout(() => setOpen(false), 80)
  }

  function cancelClose(): void {
    if (leaveTimer.current !== null) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }

  function handleWrapperEnter(): void {
    cancelClose()
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      anchorRect.current = rect
      const left = Math.min(rect.left, window.innerWidth - 288 - 8)
      setPos({ top: rect.bottom + 4, left })
    }
    setOpen(true)
  }

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative inline-flex items-center"
        onMouseEnter={handleWrapperEnter}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onFocus={handleWrapperEnter}
          onBlur={scheduleClose}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none ml-1"
          aria-label={`Explicação: ${detail.label}`}
        >
          <HelpCircle size={12} />
        </button>
      </div>

      {open && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-72 border border-border bg-card shadow-lg p-3 max-h-72 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, borderRadius: 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <p className="text-[11px] font-bold text-foreground mb-1">{detail.label}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{detail.description}</p>
          <div className="border-t border-border pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">O que fazer</p>
            <p className="text-[11px] text-foreground leading-relaxed">{detail.action}</p>
          </div>
        </div>
      )}
    </>
  )
}
