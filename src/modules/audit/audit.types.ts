export type AuditAction =
  | "employee.created"
  | "employee.updated"
  | "employee.deactivated"
  | "department.created"
  | "department.updated"
  | "survey.configured"
  | "survey.dispatched"
  | "document.uploaded"
  | "action_plan.created"
  | "action_plan.updated"
  | "report.submitted"
  | "user.login"
  | "user.logout"
  | "user.invited"
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
