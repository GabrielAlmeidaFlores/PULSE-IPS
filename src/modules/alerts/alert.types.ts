export type AlertSeverity = "info" | "warning" | "critical"
export type AlertType =
  | "score_drop"
  | "low_score"
  | "negative_trend"
  | "low_adherence"
  | "crisis_report"
  | "pgr_review_due"
  | "no_response"
  | "consent_expired"
  | "billing"
  | "system"

export interface AlertRecord {
  id: string
  tenantId: string
  departmentId: string | null
  type: AlertType
  severity: AlertSeverity
  message: string
  isRead: boolean
  resolvedAt: Date | null
  createdAt: Date
}
