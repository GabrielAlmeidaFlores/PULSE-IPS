export type ConsentEvent = "accepted" | "refused" | "opted_out" | "revoked"
export type ConsentSource = "message_link" | "admin" | "import" | "health_survey_form"

export interface ConsentTermVersion {
  id: string
  version: string
  content: string
  contentHash: string
  isActive: boolean
  createdAt: Date
}

export interface ConsentRecord {
  id: string
  tenantId: string
  employeeId: string
  consentTermVersionId: string
  event: ConsentEvent
  source: ConsentSource
  documentHash: string | null
  createdAt: Date
}

export interface CreateConsentTermVersionInput {
  version: string
  content: string
}

export interface CreateConsentRecordInput {
  tenantId: string
  employeeId: string
  consentTermVersionId: string
  event: ConsentEvent
  source: ConsentSource
  documentHash?: string | undefined
}

