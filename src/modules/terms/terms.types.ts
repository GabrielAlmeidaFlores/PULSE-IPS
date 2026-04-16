export interface CreateTermsVersionInput {
  version: string
  title: string
  content: string
  effectiveAt: Date
}

export interface AcceptTermsInput {
  userId: string
  termsVersionId: string
  ipAddress: string
  userAgent: string
}
