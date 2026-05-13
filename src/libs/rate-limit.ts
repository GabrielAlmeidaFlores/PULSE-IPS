import { headers } from "next/headers"
import { getRateLimiterService } from "@/libs/integrations"
import { extractClientIp } from "@/libs/utils/client-ip"
import type { RateLimitCheckResult } from "@/libs/integrations/rate-limiter/rate-limiter.interface"

export type { RateLimitCheckResult as RateLimitResult }

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitCheckResult> {
  return getRateLimiterService().check(key, limit, windowSeconds)
}

export async function getClientIp(): Promise<string> {
  const headerStore = await headers()
  return extractClientIp(headerStore) ?? "unknown"
}

function formatRateLimitRetryMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60)
  if (minutes <= 1) return "Muitas tentativas. Tente novamente em instantes."
  return `Muitas tentativas. Tente novamente em ${minutes} minutos.`
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<string | null> {
  const result = await checkRateLimit(key, limit, windowSeconds)
  if (!result.allowed) return formatRateLimitRetryMessage(result.retryAfterSeconds)
  return null
}

