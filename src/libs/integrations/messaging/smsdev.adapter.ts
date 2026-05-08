import { env } from "@/env"
import type {
  BulkMessageParams,
  BulkMessageResult,
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

interface SmsDevResponse {
  situacao: string
  codigo: string
  id: string
  number: string
  descricao: string
}

export class SmsDevAdapter implements IMessagingService {
  private readonly baseUrl = "https://api.smsdev.com.br/v1/send"
  private readonly messageType = "9"

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!env.SMSDEV_API_KEY) {
      throw new Error("SMSDev não configurado: defina SMSDEV_API_KEY")
    }

    const number = params.to.replace(/^\+/, "")

    const url = new URL(this.baseUrl)
    url.searchParams.set("key", env.SMSDEV_API_KEY)
    url.searchParams.set("type", this.messageType)
    url.searchParams.set("number", number)
    url.searchParams.set("msg", params.body)

    try {
      const response = await fetch(url.toString())
      const data = (await response.json()) as SmsDevResponse

      if (data.situacao !== "OK") {
        return { externalId: null, status: "failed", error: data.descricao }
      }

      return { externalId: data.id, status: "queued" }
    } catch (error) {
      return { externalId: null, status: "failed", error: String(error) }
    }
  }

  async sendBulk(params: BulkMessageParams): Promise<BulkMessageResult> {
    const results = await Promise.allSettled(params.recipients.map((r) => this.send(r)))
    const resolved = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : ({ externalId: null, status: "failed" as const, error: "rejected" } satisfies SendMessageResult),
    )
    return {
      sent: resolved.filter((r) => r.status !== "failed").length,
      failed: resolved.filter((r) => r.status === "failed").length,
      results: resolved,
    }
  }
}
