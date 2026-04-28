import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-sms")

export class ConsoleSmsAdapter implements IMessagingService {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-sms-${Date.now()}`
    logger.info("📱 FAKE SMS", { to: params.to, body: params.body, id: externalId })
    return { externalId, status: "sent" }
  }

  async sendBulk(params: BulkMessageParams): Promise<BulkMessageResult> {
    const results: SendMessageResult[] = []
    for (const recipient of params.recipients) {
      const result = await this.send(recipient)
      results.push(result)
    }
    return { sent: results.length, failed: 0, results }
  }
}
