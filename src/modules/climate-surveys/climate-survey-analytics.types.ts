export const CLIMATE_SURVEY_ANALYTICS_EVENT = {
  SURVEY_CREATED: "pesquisa_criada",
  QUESTION_SELECTED: "pergunta_selecionada",
  CAMPAIGN_DISPATCHED: "campanha_disparada",
  EMAIL_OPENED: "email_aberto",
  LINK_CLICKED: "link_clicado",
  RESPONSE_STARTED: "resposta_iniciada",
  RESPONSE_COMPLETED: "resposta_concluida",
  REMINDER_DISPATCHED: "lembrete_disparado",
  ACTION_CREATED: "acao_criada",
  ACTION_COMPLETED: "acao_concluida",
} as const

export type ClimateSurveyAnalyticsEventName =
  (typeof CLIMATE_SURVEY_ANALYTICS_EVENT)[keyof typeof CLIMATE_SURVEY_ANALYTICS_EVENT]

export const CLIMATE_SURVEY_ANALYTICS_EVENT_LABELS: Record<ClimateSurveyAnalyticsEventName, string> = {
  pesquisa_criada: "Pesquisa criada",
  pergunta_selecionada: "Pergunta selecionada",
  campanha_disparada: "Campanha disparada",
  email_aberto: "E-mail aberto",
  link_clicado: "Link clicado",
  resposta_iniciada: "Resposta iniciada",
  resposta_concluida: "Resposta concluída",
  lembrete_disparado: "Lembrete disparado",
  acao_criada: "Ação criada",
  acao_concluida: "Ação concluída",
}

export interface RecordClimateSurveyAnalyticsEventInput {
  event: ClimateSurveyAnalyticsEventName
  configId?: string
  dispatchId?: string
  actionPlanId?: string
  questionId?: string
  questionOrder?: number
  emailLogId?: string
  sessionId?: string
  quantity?: number
}

export interface ClimateSurveyAnalyticsEventRecord {
  id: string
  tenantId: string
  event: string
  configId: string | null
  dispatchId: string | null
  actionPlanId: string | null
  questionId: string | null
  questionOrder: number | null
  emailLogId: string | null
  sessionId: string | null
  quantity: number
  createdAt: Date
}

export interface ClimateSurveyResponseSessionRecord {
  id: string
  tenantId: string
  dispatchId: string
  tokenId: string
  startedAt: Date
  completedAt: Date | null
  lastQuestionId: string | null
  lastQuestionOrder: number | null
  questionCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateClimateSurveyResponseSessionInput {
  dispatchId: string
  tokenId: string
  questionCount: number
  startedAt: Date
}

export interface UpdateClimateSurveyResponseSessionProgressInput {
  lastQuestionId: string
  lastQuestionOrder: number
}

export interface ClimateSurveyQuestionAbandonmentRow {
  questionOrder: number | null
  questionId: string | null
  abandonedCount: number
  abandonmentPercentOfStarts: number | null
}

export interface ClimateSurveyFunnelMetrics {
  dispatchId: string | null
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  openRatePercent: number | null
  clickRatePercent: number | null
  totalRecipients: number
  responseStarts: number
  responseCompletions: number
  startRatePercent: number | null
  completionRatePercent: number | null
  averageResponseTimeSeconds: number | null
  abandonmentByQuestion: ClimateSurveyQuestionAbandonmentRow[]
}
