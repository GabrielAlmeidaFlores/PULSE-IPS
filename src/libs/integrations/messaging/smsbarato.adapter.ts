import { env } from "@/env"
import type {
  HealthSurveyMessageParams,
  IMessagingService,
  SendMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"

const SMSBARATO_MAX_TEXT_CHARS = 150
const URL_REGEX = /https?:\/\/\S+/

function normalizeSmsBaratoPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "")
  if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
    return digitsOnly.slice(2)
  }
  return digitsOnly
}

function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function normalizeSmsBaratoText(body: string): string {
  const urlMatch = URL_REGEX.exec(body)
  const url = urlMatch ? urlMatch[0] : null
  const textPart = url !== null ? body.replace(url, "").trim() : body

  const normalizedText = removeAccents(textPart)
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SMSBARATO_MAX_TEXT_CHARS)

  return url !== null ? `${normalizedText} ${url}` : normalizedText
}

function buildMessageText(template: string, recipientName: string, surveyLink: string): string {
  return template.replace("{nome}", recipientName).replace("{link}", surveyLink)
}

async function sendSms(phone: string, messageText: string): Promise<SendMessageResult> {
  if (!env.SMSBARATO_API_KEY) {
    return { externalId: null, status: "failed", error: "SMSBARATO_API_KEY não configurado" }
  }

  const dest = normalizeSmsBaratoPhone(phone)
  const text = normalizeSmsBaratoText(messageText)

  const url = new URL(env.SMSBARATO_BASE_URL)
  url.searchParams.set("chave", env.SMSBARATO_API_KEY)
  url.searchParams.set("dest", dest)
  url.searchParams.set("text", text)

  try {
    const response = await fetch(url.toString())
    const body = (await response.text()).trim()

    if (body.startsWith("ERRO")) {
      return { externalId: null, status: "failed", error: body }
    }

    return { externalId: body, status: "queued" }
  } catch (error) {
    return { externalId: null, status: "failed", error: String(error) }
  }
}

export class SmsBaratoAdapter implements IMessagingService {
  sendHealthSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    const messageText = buildMessageText(env.SURVEY_MESSAGE_TEMPLATE, params.recipientName, params.surveyLink)
    return sendSms(params.recipientPhone, messageText)
  }

  sendHealthSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    const messageText = buildMessageText(env.SURVEY_REMINDER_MESSAGE_TEMPLATE, params.recipientName, params.surveyLink)
    return sendSms(params.recipientPhone, messageText)
  }
}
