import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

export class WhatsAppAdapter implements IMessagingService {
  async send(_params: SendMessageParams): Promise<SendMessageResult> {
    throw new Error("WhatsApp adapter not yet implemented")
  }

  async sendBulk(_params: BulkMessageParams): Promise<BulkMessageResult> {
    throw new Error("WhatsApp adapter not yet implemented")
  }
}
