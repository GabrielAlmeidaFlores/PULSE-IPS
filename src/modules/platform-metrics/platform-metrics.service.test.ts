import { describe, it, expect, vi, beforeEach } from "vitest"
import { getPlatformMetrics } from "@/modules/platform-metrics/platform-metrics.service"
import { getPlatformMetrics as getPlatformMetricsFromRepo } from "@/modules/platform-metrics/platform-metrics.repository"
import type { PlatformMetrics } from "@/modules/platform-metrics/platform-metrics.types"

vi.mock("@/modules/platform-metrics/platform-metrics.repository")

const mockGetMetrics = vi.mocked(getPlatformMetricsFromRepo)

const METRICS: PlatformMetrics = {
  totalOrganizations: 15,
  activeOrganizations: 12,
  newOrgsThisMonth: 2,
  totalEmployees: 340,
  totalResponses: 1200,
  activeSubscriptions: 10,
  monthlyRevenueCents: 250000,
  totalAlerts: 5,
  openActionPlans: 3,
  totalDocuments: 8,
  recentOrganizations: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMetrics.mockResolvedValue(METRICS)
})

describe("getPlatformMetrics", () => {
  it("retorna métricas da plataforma do repository", async () => {
    const result = await getPlatformMetrics()

    expect(mockGetMetrics).toHaveBeenCalledOnce()
    expect(result).toEqual(METRICS)
  })
})
