import { randomUUID } from "crypto"
import { addDays } from "date-fns"
import { env } from "@/env"
import { getEmailService } from "@/libs/integrations"
import { renderEmailTemplate } from "@/libs/email-templates"
import { AppError } from "@/libs/errors/app-error"
import { hashPassword } from "@/modules/auth/auth.service"
import {
  findOrgUserByEmailInTenant,
  findOrgUsersByTenant,
  createOrgInvitation,
  findOrgByIdOrThrow,
  findOrgInviteByToken,
  acceptInviteTransaction,
} from "@/modules/auth/auth.repository"

export async function sendInvite(
  tenantId: string,
  email: string,
  role: "admin" | "rh",
): Promise<void> {
  const existingUser = await findOrgUserByEmailInTenant(tenantId, email)
  if (existingUser) throw new AppError("USER_ALREADY_EXISTS", "Usuário já cadastrado")

  const token = randomUUID()
  const expiresAt = addDays(new Date(), 7)

  await createOrgInvitation({ tenantId, email, role, token, expiresAt })

  const org = await findOrgByIdOrThrow(tenantId)
  const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  const emailService = getEmailService()
  await emailService.send({
    to: email,
    subject: `Você foi convidado para ${org.name} no Pulse`,
    html: renderEmailTemplate({
      name: "org-invite",
      props: { orgName: org.name, inviteUrl, role },
    }),
  })
}

export async function acceptInvite(
  token: string,
  password: string,
  name: string,
): Promise<void> {
  const invitation = await findOrgInviteByToken(token)

  if (!invitation) throw new AppError("INVITE_NOT_FOUND", "Convite não encontrado")
  if (invitation.usedAt) throw new AppError("INVITE_USED", "Este convite já foi utilizado")
  if (invitation.expiresAt < new Date()) throw new AppError("INVITE_EXPIRED", "Este convite expirou")

  const passwordHash = await hashPassword(password)

  await acceptInviteTransaction({
    tenantId: invitation.tenantId,
    email: invitation.email,
    passwordHash,
    name,
    role: invitation.role,
    invitationId: invitation.id,
  })

  const emailService = getEmailService()
  await emailService.send({
    to: invitation.email,
    subject: `Welcome to ${invitation.organization.name} on Pulse`,
    html: `<p>Welcome to <strong>${invitation.organization.name}</strong>! Your account has been created successfully.</p>`,
  })
}

export function getInviteByToken(token: string): ReturnType<typeof findOrgInviteByToken> {
  return findOrgInviteByToken(token)
}


export function getOrgUsers(tenantId: string): ReturnType<typeof findOrgUsersByTenant> {
  return findOrgUsersByTenant(tenantId)
}
