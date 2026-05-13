import Redis from "ioredis"
import { env } from "@/env"

declare global {
  var __redisClient: Redis | undefined
}

function createRedisClient(): Redis {
  return new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    ...(env.REDIS_PASSWORD !== undefined ? { password: env.REDIS_PASSWORD } : {}),
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
  })
}

export const redis: Redis =
  globalThis.__redisClient ?? (globalThis.__redisClient = createRedisClient())
