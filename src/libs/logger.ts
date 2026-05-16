import pino from "pino"
import { env } from "@/env"

export const logger = pino({
  level: env.LOG_LEVEL ?? "info",
  ...(env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } } }
    : {}),
})
