export interface RateLimitCheckResult {
  allowed: boolean
  retryAfterSeconds: number
}

export interface IRateLimiterService {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheckResult>
}
