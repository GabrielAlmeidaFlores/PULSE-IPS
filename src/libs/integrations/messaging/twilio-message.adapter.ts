import Twilio from "twilio"
import { env } from "@/env"
import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

export class TwilioMessageAdapter implements IMessagingService {
  private client = Twilio(env.TWILIO_ACCOUNT_SID ?? "", env.TWILIO_AUTH_TOKEN ?? "")

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
      throw new Error("Twilio não configurado: defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM_NUMBER")
    }
    try {
      const message = await this.client.messages.create({
        body: params.body,
        from: env.TWILIO_FROM_NUMBER,
        to: params.to,
      })
      return { externalId: message.sid, status: "queued" }
    } catch (error) {
      return { externalId: "", status: "failed", error: String(error) }
    }
  }

  async sendBulk(params: BulkMessageParams): Promise<BulkMessageResult> {
    const results = await Promise.allSettled(params.recipients.map((r) => this.send(r)))
    const resolved = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : ({ externalId: "", status: "failed" as const, error: "rejected" } satisfies SendMessageResult),
    )
    return {
      sent: resolved.filter((r) => r.status !== "failed").length,
      failed: resolved.filter((r) => r.status === "failed").length,
      results: resolved,
    }
  }
}
