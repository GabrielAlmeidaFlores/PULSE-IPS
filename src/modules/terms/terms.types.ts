export interface PlatformTermsVersion {
  id: string
  version: string
  title: string
  content: string
  isActive: boolean
  effectiveAt: Date
  createdAt: Date
}

export interface PlatformTermsAcceptance {
  id: string
  userId: string
  termsVersionId: string
  acceptedAt: Date
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface CreateTermsVersionInput {
  version: string
  title: string
  content: string
  effectiveAt: Date
}

export interface AcceptTermsInput {
  userId: string
  termsVersionId: string
  ipAddress: string | null
  userAgent: string | null
}
