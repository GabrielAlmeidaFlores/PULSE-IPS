export class MessagingTemporaryError extends Error {
  override readonly name = "MessagingTemporaryError"

  constructor(message: string) {
    super(message)
  }
}

export function isMessagingTemporaryError(error: unknown): error is MessagingTemporaryError {
  return error instanceof MessagingTemporaryError
}

const TEMPORARY_ERROR_PATTERNS = [
  /timeout/i,
  /temporar/i,
  /unavailable/i,
  /try again/i,
  /tente novamente/i,
  /rate limit/i,
  /too many/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /fetch failed/i,
  /502/,
  /503/,
  /504/,
]

export function isRetryableMessagingFailure(errorText: string): boolean {
  return TEMPORARY_ERROR_PATTERNS.some((pattern) => pattern.test(errorText))
}
