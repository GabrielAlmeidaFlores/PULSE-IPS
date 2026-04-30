export type PlanFeature = "action_plans" | "documents" | "anonymous_reports" | "pgr" | "messaging"

export const ALL_PLAN_FEATURES: PlanFeature[] = ["action_plans", "documents", "anonymous_reports", "pgr", "messaging"]

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  action_plans: "Planos de Ação",
  documents: "Documentos",
  anonymous_reports: "Relatos Anônimos",
  pgr: "PGR",
  messaging: "Envio de Mensagens",
}

export interface PlanDisplayFeature {
  key: string
  label: string
  alwaysEnabled: boolean
}

export const ALL_DISPLAY_FEATURES: PlanDisplayFeature[] = [
  { key: "health-surveys", label: "Pesquisas de Clima e Saúde", alwaysEnabled: true },
  { key: "messaging", label: "Envio de Mensagens", alwaysEnabled: false },
  { key: "action_plans", label: "Planos de Ação", alwaysEnabled: false },
  { key: "documents", label: "Documentos", alwaysEnabled: false },
  { key: "anonymous_reports", label: "Relatos Anônimos", alwaysEnabled: false },
  { key: "pgr", label: "PGR", alwaysEnabled: false },
]

export interface Plan {
  id: string
  name: string
  description: string | null
  maxEmployees: number | null
  externalProductId: string | null
  isActive: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PlanWithFeatures extends Plan {
  features: PlanFeature[]
}

export interface PlanPrice {
  id: string
  planId: string
  externalPriceId: string | null
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
  features?: PlanFeature[] | undefined
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

export interface SetPlanFeaturesInput {
  planId: string
  features: PlanFeature[]
}
