import { getPlatformMetrics as getPlatformMetricsFromRepo } from "@/modules/platform-metrics/platform-metrics.repository"
import type { PlatformMetrics } from "@/modules/platform-metrics/platform-metrics.types"

export function getPlatformMetrics(): Promise<PlatformMetrics> {
  return getPlatformMetricsFromRepo()
}
