export interface PlatformMetrics {
  totalOrganizations: number
  activeOrganizations: number
  newOrgsThisMonth: number
  totalEmployees: number
  totalResponses: number
  activeSubscriptions: number
  monthlyRevenueCents: number
  totalAlerts: number
  openActionPlans: number
  totalDocuments: number
  recentOrganizations: RecentOrg[]
}

export interface RecentOrg {
  id: string
  name: string
  slug: string
  billingStatus: string
  isActive: boolean
  createdAt: Date
  planName: string | null
  employeeCount: number
  subscriptionStatus: string | null
  priceInCents: number | null
}
