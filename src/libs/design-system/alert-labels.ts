export const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"
export const BADGE_RED    = "badge-danger"
export const BADGE_BLUE   = "badge-info"
export const BADGE_GREEN  = "badge-success"
export const BADGE_AMBER  = "badge-warning"
export const BADGE_YELLOW = "badge-warning"
export const BADGE_PURPLE = "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
export const BADGE_BASE = "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"

export const SEVERITY_LABELS: Record<string, string> = {
  info: "Informativo",
  low: "Informativo",
  warning: "Atenção",
  medium: "Atenção",
  critical: "Crítico",
  high: "Crítico",
}

export const SEVERITY_STYLE: Record<string, string> = {
  info: BADGE_BLUE,
  low: BADGE_BLUE,
  warning: BADGE_YELLOW,
  medium: BADGE_YELLOW,
  critical: BADGE_RED,
  high: BADGE_RED,
}

export const SEVERITY_DOT: Record<string, string> = {
  info: "bg-status-info",
  low: "bg-status-info",
  warning: "bg-status-warning",
  medium: "bg-status-warning",
  critical: "bg-status-danger",
  high: "bg-status-danger",
}

export const SEVERITY_ROW_BG: Record<string, string> = {
  info:     "bg-status-info-subtle/60 border-l-2 border-l-status-info-border",
  low:      "bg-status-info-subtle/60 border-l-2 border-l-status-info-border",
  warning:  "bg-status-warning-subtle/60 border-l-2 border-l-status-warning-border",
  medium:   "bg-status-warning-subtle/60 border-l-2 border-l-status-warning-border",
  critical: "bg-status-danger-subtle/60 border-l-2 border-l-status-danger-border",
  high:     "bg-status-danger-subtle/60 border-l-2 border-l-status-danger-border",
}

export const TYPE_LABELS: Record<string, string> = {
  score_drop: "Queda no bem-estar",
  low_score: "Bem-estar abaixo do esperado",
  pgr_review_due: "Revisão PGR pendente",
  negative_trend: "Tendência de piora persistente",
  low_adherence: "Adesão baixa",
  no_response: "Sem resposta",
  consent_expired: "Consentimento expirado",
}

export const TYPE_STYLE: Record<string, string> = {
  score_drop: BADGE_RED,
  low_score: BADGE_AMBER,
  pgr_review_due: BADGE_BLUE,
  negative_trend: BADGE_RED,
  low_adherence: BADGE_YELLOW,
  no_response: BADGE_RED,
  consent_expired: BADGE_DEFAULT,
  crisis_report: BADGE_RED,
}
