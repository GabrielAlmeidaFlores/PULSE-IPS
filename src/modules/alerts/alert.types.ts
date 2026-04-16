export type AlertSeverity = "info" | "warning" | "critical"
export type AlertType = "low_score" | "no_response" | "consent_expired" | "billing" | "system"

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
