import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { OrgInviteEmail } from "@/libs/email-templates/org-invite"
import { EmailVerificationEmail } from "@/libs/email-templates/email-verification"
import { PasswordResetEmail } from "@/libs/email-templates/password-reset"
import { PlanSubscribedEmail } from "@/libs/email-templates/plan-subscribed"
import { PaymentFailedEmail } from "@/libs/email-templates/payment-failed"
import { PlanCancelledEmail } from "@/libs/email-templates/plan-cancelled"

type EmailTemplate =
  | { name: "org-invite"; props: { orgName: string; inviteUrl: string; role: string } }
  | { name: "email-verification"; props: { verificationUrl: string } }
  | { name: "password-reset"; props: { resetUrl: string } }
  | {
      name: "plan-subscribed"
      props: { orgName: string; planName: string; priceFormatted: string; interval: string }
    }
  | { name: "payment-failed"; props: { orgName: string; portalUrl: string } }
  | { name: "plan-cancelled"; props: { orgName: string; endDate: string } }

export function renderEmailTemplate(template: EmailTemplate): string {
  switch (template.name) {
    case "org-invite":
      return renderToStaticMarkup(createElement(OrgInviteEmail, template.props))
    case "email-verification":
      return renderToStaticMarkup(createElement(EmailVerificationEmail, template.props))
    case "password-reset":
      return renderToStaticMarkup(createElement(PasswordResetEmail, template.props))
    case "plan-subscribed":
      return renderToStaticMarkup(createElement(PlanSubscribedEmail, template.props))
    case "payment-failed":
      return renderToStaticMarkup(createElement(PaymentFailedEmail, template.props))
    case "plan-cancelled":
      return renderToStaticMarkup(createElement(PlanCancelledEmail, template.props))
  }
}
