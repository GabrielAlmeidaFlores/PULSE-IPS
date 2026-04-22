export type ConsentEvent = "accepted" | "refused" | "opted_out" | "invited"
export type ConsentSource = "sms_link" | "admin" | "import" | "survey_form"

export interface ConsentRecord {
  id: string
  tenantId: string
  employeeId: string
  consentTermVersionId: string
  event: ConsentEvent
  source: ConsentSource
  cpfHash: string | null
  token: string | null
  tokenExpiresAt: Date | null
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
  cpfHash?: string | undefined
  token?: string | undefined
  tokenExpiresAt?: Date | undefined
}

