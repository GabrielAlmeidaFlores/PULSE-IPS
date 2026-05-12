export interface SendMessageParams {
  to: string
  body: string
}

export interface SendMessageResult {
  externalId: string | null
  status: "queued" | "sent" | "failed"
  error?: string
}

export interface BulkMessageParams {
  recipients: { to: string; body: string }[]
}

export interface BulkMessageResult {
  sent: number
  failed: number
  results: SendMessageResult[]
}

export interface IMessagingService {
  send(params: SendMessageParams): Promise<SendMessageResult>
  sendBulk(params: BulkMessageParams): Promise<BulkMessageResult>
}
