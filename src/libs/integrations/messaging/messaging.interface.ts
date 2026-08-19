export interface HealthSurveyMessageParams {
  recipientPhone: string
  recipientName: string
  orgName: string
  surveyLink: string
}

export type ClimateSurveyMessageParams = HealthSurveyMessageParams

export interface SendMessageResult {
  externalId: string | null
  status: "queued" | "sent" | "failed"
  error?: string
}

export interface IMessagingService {
  sendHealthSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult>
  sendHealthSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult>
  sendClimateSurveyDispatch(params: ClimateSurveyMessageParams): Promise<SendMessageResult>
  sendClimateSurveyReminder(params: ClimateSurveyMessageParams): Promise<SendMessageResult>
}
