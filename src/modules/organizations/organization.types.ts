export interface Organization {
  id: string
  name: string
  slug: string
  planId: string | null
  externalCustomerId: string | null
  billingStatus: string
  maxEmployeesOverride: number | null
  timezone: string
  trialExpiresAt: Date | null
  isActive: boolean
  deletionScheduledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateOrganizationInput {
  name: string
  slug: string
  planId?: string
  timezone?: string
}

export interface UpdateOrganizationInput {
  name?: string
  timezone?: string
  isActive?: boolean
  maxEmployeesOverride?: number | null
}

export interface OrgUserSummary {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

export interface OrgAuditEntry {
  id: string
  userId: string | null
  userName: string | null
  action: string
  resource: string
  resourceId: string | null
  metadata: Record<string, string | number | boolean | null> | null
  createdAt: Date
}

export interface OrgFullDetail {
  id: string
  name: string
  slug: string
  externalCustomerId: string | null
  billingStatus: string
  maxEmployeesOverride: number | null
  timezone: string
  trialExpiresAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  plan: { id: string; name: string; maxEmployees: number | null } | null
  subscription: {
    id: string
    status: string
    snapshotPlanName: string
    snapshotMaxEmployees: number | null
    snapshotPriceInCents: number
    snapshotInterval: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    createdAt: Date
  } | null
  users: OrgUserSummary[]
  recentAuditLogs: OrgAuditEntry[]
  employeeCounts: { active: number; inactive: number; paused: number }
  departmentCount: number
  dispatchCount: number
  responseCount: number
  openAlertCount: number
  totalAlertCount: number
  reportCount: number
  openReportCount: number
  documentCount: number
  actionPlanCount: number
  openActionPlanCount: number
  messagesThisMonth: number
  lastPgrReview: { reviewedAt: Date | null; nextReviewAt: Date | null } | null
  deletionScheduledAt: Date | null
}
