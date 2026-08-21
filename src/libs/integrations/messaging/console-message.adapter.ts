import type {
  HealthSurveyMessageParams,
  IMessagingService,
  SendMessageResult,
} from "@/libs/integrations/messaging/messaging.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-message")

export class ConsoleMessageAdapter implements IMessagingService {
  sendHealthSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-message-${Date.now()}`
    logger.info("FAKE DISPATCH MESSAGE", { recipientPhone: params.recipientPhone, recipientName: params.recipientName, surveyLink: params.surveyLink, id: externalId })
    return Promise.resolve({ externalId, status: "sent" })
  }

  sendHealthSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-message-${Date.now()}`
    logger.info("FAKE REMINDER MESSAGE", { recipientPhone: params.recipientPhone, recipientName: params.recipientName, surveyLink: params.surveyLink, id: externalId })
    return Promise.resolve({ externalId, status: "sent" })
  }

  sendClimateSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-climate-${Date.now()}`
    logger.info("FAKE CLIMATE DISPATCH MESSAGE", { recipientPhone: params.recipientPhone, recipientName: params.recipientName, surveyLink: params.surveyLink, id: externalId })
    return Promise.resolve({ externalId, status: "sent" })
  }

  sendClimateSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult> {
    const externalId = `fake-climate-${Date.now()}`
    logger.info("FAKE CLIMATE REMINDER MESSAGE", { recipientPhone: params.recipientPhone, recipientName: params.recipientName, surveyLink: params.surveyLink, id: externalId })
    return Promise.resolve({ externalId, status: "sent" })
  }
}
