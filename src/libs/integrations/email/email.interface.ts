export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  id: string
  error?: string
}

export interface IEmailService {
  send(params: SendEmailParams): Promise<SendEmailResult>
}
