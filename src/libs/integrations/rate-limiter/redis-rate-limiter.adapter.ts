import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible"
import { redisClient } from "@/libs/integrations/rate-limiter/redis-client"
import type { IRateLimiterService, RateLimitCheckResult } from "@/libs/integrations/rate-limiter/rate-limiter.interface"

export class RedisRateLimiterAdapter implements IRateLimiterService {
  private readonly instanceCache = new Map<string, RateLimiterRedis>()

  private getOrCreateInstance(limit: number, windowSeconds: number): RateLimiterRedis {
    const cacheKey = `${limit}:${windowSeconds}`
    const existing = this.instanceCache.get(cacheKey)
    if (existing !== undefined) return existing
    const instance = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "",
      points: limit,
      duration: windowSeconds,
      rejectIfRedisNotReady: true,
    })
    this.instanceCache.set(cacheKey, instance)
    return instance
  }

  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheckResult> {
    try {
      await this.getOrCreateInstance(limit, windowSeconds).consume(key)
      return { allowed: true, retryAfterSeconds: 0 }
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        return { allowed: false, retryAfterSeconds: Math.ceil(err.msBeforeNext / 1000) }
      }
      return { allowed: false, retryAfterSeconds: 60 }
    }
  }
}
