import { z } from "zod"
import { env } from "@/env"
import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

const whatsAppResponseSchema = z.union([
  z.object({ messages: z.array(z.object({ id: z.string() })) }),
  z.object({ error: z.object({ message: z.string() }) }),
])

type WhatsAppResponse = z.infer<typeof whatsAppResponseSchema>

function isErrorResponse(data: WhatsAppResponse): data is { error: { message: string } } {
  return "error" in data
}

export class WhatsAppAdapter implements IMessagingService {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      throw new Error(
        "WhatsApp não configurado: defina WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN",
      )
    }

    const url = `${env.WHATSAPP_API_BASE_URL}/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "text",
        text: { preview_url: false, body: params.body },
      }),
    })

    const raw: unknown = await response.json()
    const parsed = whatsAppResponseSchema.safeParse(raw)

    if (!parsed.success) {
      return { externalId: "", status: "failed", error: `Resposta inesperada da API: HTTP ${response.status}` }
    }

    if (isErrorResponse(parsed.data)) {
      return { externalId: "", status: "failed", error: parsed.data.error.message }
    }

    const messageId = parsed.data.messages[0]?.id ?? ""
    return { externalId: messageId, status: "sent" }
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
