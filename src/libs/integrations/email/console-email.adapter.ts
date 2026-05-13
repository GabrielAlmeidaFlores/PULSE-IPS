import type { IEmailService, SendEmailParams, SendEmailResult } from "@/libs/integrations/email/email.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-email")

export class ConsoleEmailAdapter implements IEmailService {
  send(params: SendEmailParams): Promise<SendEmailResult> {
    const id = `fake-email-${Date.now()}`
    logger.info("📧 FAKE EMAIL", { to: params.to, subject: params.subject, id })
    logger.debug(params.html)
    return Promise.resolve({ id })
  }
}
