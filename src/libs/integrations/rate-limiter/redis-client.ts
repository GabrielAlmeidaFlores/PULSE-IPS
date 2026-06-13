import Redis from "ioredis"
import { env } from "@/env"
import { logger } from "@/libs/logger"

declare global {
  var __redisClient: Redis | undefined
}

function createRedisClient(): Redis {
  const isTest = env.NODE_ENV === "test"

  const client = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    ...(env.REDIS_PASSWORD !== undefined ? { password: env.REDIS_PASSWORD } : {}),
    lazyConnect: isTest,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 2000,
    retryStrategy: isTest
      ? (): null => null
      : (times: number): number | null => {
          if (times > 20) {
            logger.error({ host: env.REDIS_HOST, port: env.REDIS_PORT, attempts: times }, "redis: número máximo de tentativas de reconexão atingido — desistindo")
            return null
          }
          const delay = Math.min(times * 200, 2000)
          logger.warn({ host: env.REDIS_HOST, port: env.REDIS_PORT, attempts: times, nextRetryMs: delay }, "redis: reconectando...")
          return delay
        },
    reconnectOnError: isTest
      ? (): boolean => false
      : (err: Error): boolean => {
          logger.error({ err: err.message }, "redis: erro de conexão detectado — reconectando")
          return true
        },
  })

  if (!isTest) {
    client.on("connect", () => {
      logger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, "redis: conectado")
    })

    client.on("ready", () => {
      logger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, "redis: pronto para receber comandos")
    })

    client.on("error", (err: Error) => {
      logger.error({ err: err.message, host: env.REDIS_HOST, port: env.REDIS_PORT }, "redis: erro de conexão")
    })

    client.on("close", () => {
      logger.warn({ host: env.REDIS_HOST, port: env.REDIS_PORT }, "redis: conexão encerrada")
    })

    client.on("reconnecting", () => {
      logger.warn({ host: env.REDIS_HOST, port: env.REDIS_PORT }, "redis: tentando reconectar...")
    })

    client.on("end", () => {
      logger.error({ host: env.REDIS_HOST, port: env.REDIS_PORT }, "redis: conexão encerrada definitivamente — sem mais tentativas")
    })
  }

  return client
}

export function getRedisClient(): Redis {
  if (globalThis.__redisClient === undefined) {
    globalThis.__redisClient = createRedisClient()
  }
  return globalThis.__redisClient
}
