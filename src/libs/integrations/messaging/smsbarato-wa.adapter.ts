import { env } from "@/env"
import type {
  BulkMessageParams,
  BulkMessageResult,
  IMessagingService,
  SendMessageParams,
  SendMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

function normalizeSmsBaratoWaPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "")
  if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
    return digitsOnly.slice(2)
  }
  return digitsOnly
}

export class SmsBaratoWaAdapter implements IMessagingService {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!env.SMSBARATO_API_KEY) {
      return { externalId: null, status: "failed", error: "SMSBARATO_API_KEY não configurado" }
    }

    if (params.recipientName === undefined || params.surveyLink === undefined) {
      return {
        externalId: null,
        status: "failed",
        error: "Parâmetros recipientName e surveyLink são obrigatórios para o provedor smsbarato-wa",
      }
    }

    const dest = normalizeSmsBaratoWaPhone(params.recipientPhone)
    const queryParts = [
      `chave=${encodeURIComponent(env.SMSBARATO_API_KEY)}`,
      `template=${encodeURIComponent(env.SMSBARATO_WA_TEMPLATE)}`,
      `dest=${encodeURIComponent(dest)}`,
      `prm[]=${encodeURIComponent(params.recipientName)}`,
      `prm[]=${params.surveyLink}`,
    ]
    const fullUrl = `${env.SMSBARATO_WA_BASE_URL}?${queryParts.join("&")}`

    try {
      const response = await fetch(fullUrl)
      const body = (await response.text()).trim()

      if (body.startsWith("ERRO")) {
        return { externalId: null, status: "failed", error: body }
      }

      return { externalId: body, status: "queued" }
    } catch (error) {
      return { externalId: null, status: "failed", error: String(error) }
    }
  }

  async sendBulk(params: BulkMessageParams): Promise<BulkMessageResult> {
    const results = await Promise.allSettled(
      params.recipients.map((r) => this.send(r)),
    )
    const resolved = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : ({
            externalId: null,
            status: "failed" as const,
            error: "rejected",
          } satisfies SendMessageResult),
    )
    return {
      sent: resolved.filter((r) => r.status !== "failed").length,
      failed: resolved.filter((r) => r.status === "failed").length,
      results: resolved,
    }
  }
}
