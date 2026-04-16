export interface AnonymousReportType {
  id: string
  tenantId: string
  orgSlug: string
  content: string
  category: string | null
  status: "open" | "analyzing" | "resolved" | "archived"
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateAnonymousReportInput {
  orgSlug: string
  content: string
  category?: string | undefined
}

export interface UpdateAnonymousReportInput {
  status?: "open" | "analyzing" | "resolved" | "archived"
  resolvedAt?: Date | null
}
