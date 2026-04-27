export const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"
export const BADGE_RED = "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
export const BADGE_BLUE = "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
export const BADGE_GREEN = "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
export const BADGE_AMBER = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
export const BADGE_YELLOW = "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
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
  info: "bg-blue-500",
  low: "bg-blue-500",
  warning: "bg-yellow-500",
  medium: "bg-yellow-500",
  critical: "bg-red-500",
  high: "bg-red-500",
}

export const SEVERITY_ROW_BG: Record<string, string> = {
  info: "bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-blue-400",
  low: "bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-blue-400",
  warning: "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-400",
  medium: "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-400",
  critical: "bg-red-50/60 dark:bg-red-950/20 border-l-2 border-l-red-500",
  high: "bg-red-50/60 dark:bg-red-950/20 border-l-2 border-l-red-500",
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
