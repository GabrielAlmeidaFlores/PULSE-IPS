export interface Plan {
  id: string
  name: string
  description: string | null
  maxEmployees: number
  externalProductId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PlanPrice {
  id: string
  planId: string
  externalPriceId: string
  priceInCents: number
  currency: string
  interval: string
  isActive: boolean
  createdAt: Date
}

export interface CreatePlanInput {
  name: string
  description?: string | undefined
  maxEmployees: number
}

export interface UpdatePlanInput {
  name?: string | undefined
  description?: string | undefined
  maxEmployees?: number | undefined
  isActive?: boolean | undefined
  externalProductId?: string | undefined
}

export type BillingInterval = "month" | "year"

export interface CreatePlanPriceInput {
  planId: string
  unitAmountInCents: number
  currency: string
  interval: BillingInterval
}

export interface CreatePlanPriceRecord {
  planId: string
  externalPriceId?: string | undefined
  priceInCents: number
  currency: string
  interval: BillingInterval
}

export interface AddDirectPriceInput {
  planId: string
  priceInCents: number
  interval: BillingInterval
}
