import { env } from "@/env"
import type {
  HealthSurveyMessageParams,
  IMessagingService,
  SendMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

function normalizeSmsBaratoWaPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "")
  if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
    return digitsOnly.slice(2)
  }
  return digitsOnly
}

async function sendWa(
  phone: string,
  recipientName: string,
  orgName: string,
  surveyLink: string,
  templateName: string,
): Promise<SendMessageResult> {
  if (!env.SMSBARATO_API_KEY) {
    return { externalId: null, status: "failed", error: "SMSBARATO_API_KEY não configurado" }
  }

  const dest = normalizeSmsBaratoWaPhone(phone)
  const queryParts = [
    `chave=${encodeURIComponent(env.SMSBARATO_API_KEY)}`,
    `template=${encodeURIComponent(templateName)}`,
    `dest=${encodeURIComponent(dest)}`,
    `prm[]=${encodeURIComponent(recipientName)}`,
    `prm[]=${encodeURIComponent(orgName)}`,
    `prm[]=${surveyLink}`,
    `prm[]=${encodeURIComponent(orgName)}`,
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

export class SmsBaratoWaAdapter implements IMessagingService {
  sendHealthSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    return sendWa(params.recipientPhone, params.recipientName, params.orgName, params.surveyLink, env.SMSBARATO_WA_TEMPLATE)
  }

  sendHealthSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    return sendWa(params.recipientPhone, params.recipientName, params.orgName, params.surveyLink, env.SMSBARATO_WA_REMINDER_TEMPLATE)
  }
}
