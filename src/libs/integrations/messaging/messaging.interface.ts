export interface HealthSurveyMessageParams {
  recipientPhone: string
  recipientName: string
  surveyLink: string
}

export interface SendMessageResult {
  externalId: string | null
  status: "queued" | "sent" | "failed"
  error?: string
}

export interface IMessagingService {
  sendHealthSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult>
  sendHealthSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult>
}
