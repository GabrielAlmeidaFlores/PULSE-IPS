import type { IRateLimiterService, RateLimitCheckResult } from "@/libs/integrations/rate-limiter/rate-limiter.interface"

interface RateLimitBucket {
  count: number
  expiresAt: number
}

export class InMemoryRateLimiterAdapter implements IRateLimiterService {
  private readonly buckets = new Map<string, RateLimitBucket>()

  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheckResult> {
    const now = Date.now()
    const bucketKey = `${key}:${windowSeconds}`
    const existing = this.buckets.get(bucketKey)

    if (existing === undefined || existing.expiresAt <= now) {
      this.buckets.set(bucketKey, { count: 1, expiresAt: now + windowSeconds * 1000 })
      return Promise.resolve({ allowed: true, retryAfterSeconds: 0 })
    }

    existing.count += 1

    if (existing.count > limit) {
      const retryAfterSeconds = Math.ceil((existing.expiresAt - now) / 1000)
      return Promise.resolve({ allowed: false, retryAfterSeconds })
    }

    return Promise.resolve({ allowed: true, retryAfterSeconds: 0 })
  }
}
