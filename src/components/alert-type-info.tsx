"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"

interface AlertTypeDetail {
  label: string
  description: string
  action: string
  steps?: string[]
}

const ALERT_DETAILS: Record<string, AlertTypeDetail> = {
  score_drop: {
    label: "Queda no bem-estar",
    description: "O índice de saúde do setor caiu mais de 1 ponto em relação ao período anterior.",
    action: "Revise as respostas das pesquisas, identifique qual fator piorou e crie um plano de ação para endereçar a causa.",
  },
  low_score: {
    label: "Bem-estar abaixo do esperado",
    description: "O índice de saúde do setor está abaixo do limiar de atenção (índice < 37%).",
    action: "Investigue a causa raiz, converse com a equipe e elabore um plano de ação para melhorar o clima ocupacional.",
  },
  pgr_review_due: {
    label: "Revisão PGR pendente",
    description: "A revisão obrigatória do PGR vence em até 30 dias. A NR-1 exige documentação periódica dos riscos psicossociais — ausência de registro expõe a empresa a multas.",
    action: "Siga os passos abaixo para concluir a revisão:",
    steps: [
      "Acesse PGR no menu lateral.",
      "Clique em Gerar relatório e selecione o mês/ano — faça isso apenas quando o mês estiver encerrado.",
      "Revise os indicadores: índice de saúde, alertas ativos e planos de ação.",
      "Se houver setores críticos, crie Planos de Ação antes de concluir.",
      "Clique em Marcar como revisado para gerar a evidência legal exigida pelo PGR.",
    ],
  },
  negative_trend: {
    label: "Tendência de piora persistente",
    description: "O índice de saúde do setor ficou abaixo da média histórica por 3 períodos consecutivos — sinal de problema persistente.",
    action: "Situação requer atenção urgente. Revise o contexto da equipe, aplique pesquisas qualitativas e implemente planos de ação estruturados.",
  },
  low_adherence: {
    label: "Adesão baixa",
    description: "Menos de 80% dos colaboradores responderam à pesquisa dentro de 48 horas após o disparo.",
    action: "Reforce junto aos gestores a importância de responder e verifique se todos os colaboradores do setor têm dados de contato cadastrados.",
  },
  no_response: {
    label: "Sem resposta",
    description: "Nenhuma resposta foi recebida neste ciclo de pesquisa.",
    action: "Verifique se o disparo foi concluído sem erros nos logs de jobs e se os colaboradores do setor têm dados de contato cadastrados.",
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
      const tipHeight = tooltipRef.current.getBoundingClientRect().height
      const anchor = anchorRect.current
      const spaceBelow = window.innerHeight - anchor.bottom - 8
      const spaceAbove = anchor.top - 8
      if (tipHeight > spaceBelow && spaceAbove > spaceBelow) {
        setPos((prev) => ({ ...prev, top: anchor.top - tipHeight - 4 }))
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
      const left = Math.min(rect.left, window.innerWidth - 320 - 8)
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
          className="fixed z-50 border border-border bg-card shadow-lg p-3"
          style={{ top: pos.top, left: pos.left, borderRadius: 0, width: "18rem", maxWidth: "calc(100vw - 16px)" }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <p className="text-[11px] font-bold text-foreground mb-1 break-words">{detail.label}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 break-words whitespace-normal">{detail.description}</p>
          <div className="border-t border-border pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">O que fazer</p>
            <p className="text-[11px] text-foreground leading-relaxed break-words whitespace-normal">{detail.action}</p>
            {detail.steps !== undefined && detail.steps.length > 0 && (
              <ol className="mt-2 space-y-1.5 list-none">
                {detail.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 min-w-0">
                    <span className="shrink-0 w-4 h-4 bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-foreground leading-relaxed break-words whitespace-normal min-w-0 flex-1">{step}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  )
}
