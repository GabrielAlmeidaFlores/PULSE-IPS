import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

export class ConsoleSmsAdapter implements IMessagingService {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-sms-${Date.now()}`
    console.log("\n📱 [FAKE SMS]")
    console.log(`  To:   ${params.to}`)
    console.log(`  Body: ${params.body}`)
    console.log(`  ID:   ${externalId}\n`)
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
