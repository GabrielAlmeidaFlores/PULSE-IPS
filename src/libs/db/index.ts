import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { env } from "@/env"

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: ["error"],
  })
}

function isUsablePrismaClient(client: PrismaClient): boolean {
  return (
    typeof client.climateSurveyDispatch?.findFirst === "function" &&
    typeof client.emailLog?.findFirst === "function" &&
    typeof client.healthSurveyDispatch?.findFirst === "function"
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing !== undefined && isUsablePrismaClient(existing)) {
    return existing
  }

  const client = createPrismaClient()
  if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()
