export type AuditAction =
  | "employee.created"
  | "employee.updated"
  | "employee.deactivated"
  | "employee.deleted"
  | "department.created"
  | "department.updated"
  | "department.deleted"
  | "health_survey.configured"
  | "health_survey.dispatched"
  | "document.uploaded"
  | "document.created"
  | "document.updated"
  | "document.deleted"
  | "document.edited"
  | "action_plan.created"
  | "action_plan.updated"
  | "anonymous_report.status_updated"
  | "report.submitted"
  | "report.exported"
  | "user.login"
  | "user.logout"
  | "user.invited"
  | "user.invite_resent"
  | "user.invite_cancelled"
  | "user.password_changed"
  | "user.password_reset"
  | "billing.checkout_started"
  | "billing.subscription_updated"

export interface AuditLog {
  id: string
  tenantId: string
  userId: string | null
  action: AuditAction
  resource: string
  resourceId: string | null
  metadata: Record<string, string | number | boolean | null> | null
  createdAt: Date
}

export interface CreateAuditLogInput {
  tenantId: string
  userId?: string
  action: AuditAction
  resource: string
  resourceId?: string
  metadata?: Record<string, string | number | boolean | null>
}
