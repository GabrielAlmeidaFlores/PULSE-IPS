export const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"
export const BADGE_RED = "bg-red-100 text-red-800 border-red-300"
export const BADGE_BASE = "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"

export const SEVERITY_LABELS: Record<string, string> = {
  info: "Informativo",
  warning: "Atenção",
  critical: "Crítico",
}

export const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  critical: BADGE_RED,
}

export const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
}

export const TYPE_LABELS: Record<string, string> = {
  score_drop: "Queda no bem-estar",
  low_score: "Bem-estar abaixo do esperado",
  pgr_review_due: "Revisão PGR pendente",
  negative_trend: "Tendência de piora persistente",
  low_adherence: "Adesão baixa",
  no_response: "Sem resposta",
  consent_expired: "Consentimento expirado",
  billing: "Cobrança",
  system: "Sistema",
  crisis_report: "Relato de crise",
}

export const TYPE_STYLE: Record<string, string> = {
  score_drop: BADGE_RED,
  low_score: "bg-amber-100 text-amber-800 border-amber-300",
  pgr_review_due: "bg-blue-100 text-blue-800 border-blue-300",
  negative_trend: BADGE_RED,
  low_adherence: "bg-yellow-100 text-yellow-800 border-yellow-300",
  no_response: BADGE_RED,
  consent_expired: BADGE_DEFAULT,
  billing: "bg-blue-100 text-blue-800 border-blue-300",
  system: BADGE_DEFAULT,
  crisis_report: BADGE_RED,
}
