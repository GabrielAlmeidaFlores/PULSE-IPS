import type { IEmailService, SendEmailParams, SendEmailResult } from "@/libs/integrations/email/email.interface"

export class ConsoleEmailAdapter implements IEmailService {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const id = `fake-email-${Date.now()}`
    console.log("\n📧 [FAKE EMAIL]")
    console.log(`To:      ${params.to}`)
    console.log(`Subject: ${params.subject}`)
    console.log(`ID:      ${id}`)
    console.log(`\n${params.html}\n`)
    return { id }
  }
}
