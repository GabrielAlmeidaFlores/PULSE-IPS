import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-message")

export class ConsoleMessageAdapter implements IMessagingService {
  send(params: SendMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-message-${Date.now()}`
    logger.info("📱 FAKE MESSAGE", { recipientPhone: params.recipientPhone, messageText: params.messageText, id: externalId })
    return Promise.resolve({ externalId, status: "sent" })
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
