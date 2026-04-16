import { join } from "path"
import { readFileSync } from "fs"

interface OrgInviteProps extends Record<string, string> {
  orgName: string
  inviteUrl: string
  role: string
}

interface EmailVerificationProps extends Record<string, string> {
  verificationUrl: string
}

interface PasswordResetProps extends Record<string, string> {
  resetUrl: string
}

interface PlanSubscribedProps extends Record<string, string> {
  orgName: string
  planName: string
  priceFormatted: string
  interval: string
}

interface PaymentFailedProps extends Record<string, string> {
  orgName: string
  portalUrl: string
}

interface PlanCancelledProps extends Record<string, string> {
  orgName: string
  endDate: string
}

type EmailTemplate =
  | { name: "org-invite"; props: OrgInviteProps }
  | { name: "email-verification"; props: EmailVerificationProps }
  | { name: "password-reset"; props: PasswordResetProps }
  | { name: "plan-subscribed"; props: PlanSubscribedProps }
  | { name: "payment-failed"; props: PaymentFailedProps }
  | { name: "plan-cancelled"; props: PlanCancelledProps }

function applyVars(html: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    html,
  )
}

export function renderEmailTemplate(template: EmailTemplate): string {
  const filePath = join(
    process.cwd(),
    "assets",
    "email",
    "template",
    `${template.name}.html`,
  )
  const html = readFileSync(filePath, "utf-8")
  return applyVars(html, template.props)
}
