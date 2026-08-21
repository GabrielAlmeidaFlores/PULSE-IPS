import { join } from "path"
import { readFileSync } from "fs"
import { env } from "@/env"

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

interface AccountDeletionConfirmProps extends Record<string, string> {
  orgName: string
  code: string
  expiresInMinutes: string
}

interface AccountDeletionScheduledProps extends Record<string, string> {
  orgName: string
  deletionDate: string
  supportEmail: string
}

interface ClimateSurveyDispatchEmailProps extends Record<string, string> {
  employeeName: string
  orgName: string
  surveyUrl: string
  openPixelUrl: string
  expiryHours: string
}

interface ClimateSurveyReminderEmailProps extends Record<string, string> {
  employeeName: string
  orgName: string
  surveyUrl: string
  openPixelUrl: string
}

type EmailTemplate =
  | { name: "org-invite"; props: OrgInviteProps }
  | { name: "email-verification"; props: EmailVerificationProps }
  | { name: "password-reset"; props: PasswordResetProps }
  | { name: "plan-subscribed"; props: PlanSubscribedProps }
  | { name: "payment-failed"; props: PaymentFailedProps }
  | { name: "plan-cancelled"; props: PlanCancelledProps }
  | { name: "account-deletion-confirm"; props: AccountDeletionConfirmProps }
  | { name: "account-deletion-scheduled"; props: AccountDeletionScheduledProps }
  | { name: "climate-survey-dispatch"; props: ClimateSurveyDispatchEmailProps }
  | { name: "climate-survey-reminder"; props: ClimateSurveyReminderEmailProps }

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
  const vars: Record<string, string> = {
    appUrl: env.NEXT_PUBLIC_APP_URL,
    ...template.props,
  }
  return applyVars(html, vars)
}
