import { env } from "@/env"
import { addDays, addMinutes, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppError } from "@/libs/errors/app-error"
import { getEmailService, getBillingService } from "@/libs/integrations"
import { renderEmailTemplate } from "@/libs/email-templates"
import { createLogger } from "@/libs/utils/logger"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import { findSubscriptionByTenantId } from "@/modules/billing/billing.repository"
import {
  createAccountDeletionToken,
  findAccountDeletionToken,
  consumeAccountDeletionToken,
  scheduleOrganizationDeletion,
  cancelOrganizationDeletionSchedule,
  findAllTenantsScheduledForDeletion,
  executeOrganizationDeletion,
} from "@/modules/organizations/account-deletion.repository"

const ACCOUNT_DELETION_CODE_EXPIRES_MINUTES = 15
const ACCOUNT_DELETION_GRACE_DAYS = 30
const logger = createLogger("account-deletion")
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"])

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function requestAccountDeletionCode(
  tenantId: string,
  userId: string,
  userEmail: string,
  orgName: string,
): Promise<void> {
  const code = generateSixDigitCode()
  const expiresAt = addMinutes(new Date(), ACCOUNT_DELETION_CODE_EXPIRES_MINUTES)

  await createAccountDeletionToken(userId, code, expiresAt)

  const emailService = getEmailService()
  await emailService.send({
    to: userEmail,
    subject: "Código de confirmação — Exclusão de conta Pulse",
    html: renderEmailTemplate({
      name: "account-deletion-confirm",
      props: {
        orgName,
        code,
        expiresInMinutes: ACCOUNT_DELETION_CODE_EXPIRES_MINUTES.toString(),
      },
    }),
  })
}

export async function confirmAccountDeletion(
  tenantId: string,
  userId: string,
  userEmail: string,
  code: string,
): Promise<{ deletionScheduledAt: Date }> {
  const authToken = await findAccountDeletionToken(userId)

  if (!authToken) throw new AppError("INVALID_CODE", "Código inválido ou expirado.")
  if (authToken.token !== code) throw new AppError("INVALID_CODE", "Código inválido ou expirado.")
  if (authToken.expiresAt < new Date()) throw new AppError("INVALID_CODE", "Código inválido ou expirado.")

  await consumeAccountDeletionToken(authToken.id)

  const org = await findOrganizationById(tenantId)
  if (!org) throw new AppError("ORG_NOT_FOUND", "Organização não encontrada.")

  const subscription = await findSubscriptionByTenantId(tenantId)
  if (subscription !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    const billing = getBillingService()
    try {
      await billing.cancelSubscription(subscription.externalSubscriptionId)
    } catch (err) {
      logger.error("falha ao cancelar assinatura no billing durante exclusão de conta", err instanceof Error ? err.message : String(err))
    }
  }

  const deletionScheduledAt = addDays(new Date(), ACCOUNT_DELETION_GRACE_DAYS)
  await scheduleOrganizationDeletion(tenantId, deletionScheduledAt)

  const deletionDateFormatted = format(deletionScheduledAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const emailService = getEmailService()
  await emailService.send({
    to: userEmail,
    subject: "Conta agendada para exclusão — Pulse",
    html: renderEmailTemplate({
      name: "account-deletion-scheduled",
      props: {
        orgName: org.name,
        deletionDate: deletionDateFormatted,
        supportEmail: env.NEXT_PUBLIC_EMAIL_SUPPORT,
      },
    }),
  })

  return { deletionScheduledAt }
}

export async function runOrganizationDeletionExecutor(): Promise<{ deleted: number }> {
  const organizations = await findAllTenantsScheduledForDeletion()
  let deleted = 0

  for (const org of organizations) {
    await executeOrganizationDeletion(org.id)
    deleted++
  }

  return { deleted }
}

export async function cancelScheduledOrganizationDeletion(tenantId: string): Promise<void> {
  const org = await findOrganizationById(tenantId)
  if (!org) throw new AppError("ORG_NOT_FOUND", "Organização não encontrada.")
  if (org.deletionScheduledAt === null) throw new AppError("NOT_SCHEDULED", "Esta organização não possui exclusão agendada.")
  await cancelOrganizationDeletionSchedule(tenantId)
}
