import { Resend } from "resend"
import { env } from "@/env"
import type { IEmailService, SendEmailParams, SendEmailResult } from "@/libs/integrations/email/email.interface"

export class ResendAdapter implements IEmailService {
  private resend = new Resend(env.RESEND_API_KEY)

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("Resend não configurado: defina RESEND_API_KEY e EMAIL_FROM")
    const { data, error } = await this.resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    if (error ?? !data) return { id: "", error: error?.message ?? "Unknown error" }
    return { id: data.id }
  }
}
