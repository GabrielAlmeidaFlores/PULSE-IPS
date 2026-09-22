import "dotenv/config"
import { env } from "../../env"
import { createLogger } from "../../libs/utils/logger"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const logger = createLogger("normalize-emails")

interface EmailRow {
  id: string
  email: string
}

function needsNormalization(row: EmailRow): boolean {
  return row.email !== row.email.trim().toLowerCase()
}

async function normalizeOrgUsers(): Promise<number> {
  const rows = await prisma.organizationUser.findMany({ select: { id: true, email: true } })
  let updated = 0

  for (const row of rows.filter(needsNormalization)) {
    const normalized = row.email.trim().toLowerCase()
    try {
      await prisma.organizationUser.update({ where: { id: row.id }, data: { email: normalized } })
      updated += 1
      logger.info(`organization_users: "${row.email}" → "${normalized}"`)
    } catch (error) {
      logger.warn(`organization_users: conflito ao normalizar "${row.email}": ${error instanceof Error ? error.message : "erro desconhecido"}`)
    }
  }

  return updated
}

async function normalizeOrgInvitations(): Promise<number> {
  const rows = await prisma.organizationInvitation.findMany({ select: { id: true, email: true } })
  let updated = 0

  for (const row of rows.filter(needsNormalization)) {
    const normalized = row.email.trim().toLowerCase()
    try {
      await prisma.organizationInvitation.update({ where: { id: row.id }, data: { email: normalized } })
      updated += 1
      logger.info(`organization_invitations: "${row.email}" → "${normalized}"`)
    } catch (error) {
      logger.warn(`organization_invitations: conflito ao normalizar "${row.email}": ${error instanceof Error ? error.message : "erro desconhecido"}`)
    }
  }

  return updated
}

async function main(): Promise<void> {
  logger.info("Iniciando normalização de e-mails...")

  const usersUpdated = await normalizeOrgUsers()
  const invitationsUpdated = await normalizeOrgInvitations()

  logger.success(`Concluído: ${usersUpdated} usuário(s) e ${invitationsUpdated} convite(s) normalizados.`)
}

main()
  .catch((err) => {
    logger.error("Backfill falhou:", err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
