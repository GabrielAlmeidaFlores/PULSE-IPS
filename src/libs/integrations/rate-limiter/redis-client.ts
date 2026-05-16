import Redis from "ioredis"
import { env } from "@/env"
import { logger } from "@/libs/logger"

declare global {
  var __redisClient: Redis | undefined
}

function createRedisClient(): Redis {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    ...(env.REDIS_PASSWORD !== undefined ? { password: env.REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 2000,
    retryStrategy: (times: number): number | null => {
      if (times > 20) {
        logger.error({ host: env.REDIS_HOST, port: env.REDIS_PORT, attempts: times }, "redis: número máximo de tentativas de reconexão atingido — desistindo")
        return null
      }
      const delay = Math.min(times * 200, 2000)
      logger.warn({ host: env.REDIS_HOST, port: env.REDIS_PORT, attempts: times, nextRetryMs: delay }, "redis: reconectando...")
      return delay
    },
    reconnectOnError: (err: Error): boolean => {
      logger.error({ err: err.message }, "redis: erro de conexão detectado — reconectando")
      return true
    },
  })

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

  return client
}

export const redisClient: Redis =
  globalThis.__redisClient ?? (globalThis.__redisClient = createRedisClient())
