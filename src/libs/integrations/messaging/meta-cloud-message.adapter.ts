import { z } from "zod"
import { env } from "@/env"
import type {
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
  BulkMessageParams,
  BulkMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

const metaCloudResponseSchema = z.union([
  z.object({ messages: z.array(z.object({ id: z.string() })) }),
  z.object({ error: z.object({ message: z.string() }) }),
])

type MetaCloudResponse = z.infer<typeof metaCloudResponseSchema>

function isErrorResponse(data: MetaCloudResponse): data is { error: { message: string } } {
  return "error" in data
}

function buildTemplatePayload(to: string, templateName: string, variables: string[]): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
      components: [
        {
          type: "body",
          parameters: variables.map((text) => ({ type: "text", text })),
        },
      ],
    },
  }
}

function buildTextPayload(to: string, body: string): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body },
  }
}

export class MetaCloudMessageAdapter implements IMessagingService {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      throw new Error(
        "Meta Cloud API não configurada: defina WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN",
      )
    }

    const url = `${env.WHATSAPP_API_BASE_URL}/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`
    const to = params.to.replace(/^\+/, "")

    const payload =
      params.templateName && params.templateVariables !== undefined
        ? buildTemplatePayload(to, params.templateName, params.templateVariables)
        : buildTextPayload(to, params.body)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const raw: unknown = await response.json()
    const parsed = metaCloudResponseSchema.safeParse(raw)

    if (!parsed.success) {
      return { externalId: null, status: "failed", error: `Resposta inesperada da API: HTTP ${response.status}` }
    }

    if (isErrorResponse(parsed.data)) {
      return { externalId: null, status: "failed", error: parsed.data.error.message }
    }

    const messageId = parsed.data.messages[0]?.id ?? null
    return { externalId: messageId, status: "sent" }
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
