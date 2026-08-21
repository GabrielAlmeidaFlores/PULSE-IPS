import { randomUUID } from "crypto"
import { env } from "@/env"
import { getEmailService } from "@/libs/integrations"
import { renderEmailTemplate } from "@/libs/email-templates"
import type { SendEmailJobData } from "@/libs/queue"
import {
  createEmailLog,
  findEmailLogByQueueJobId,
  findEmailLogByTrackingToken,
  markEmailLogClicked,
  markEmailLogOpened,
  type EmailLogRecord,
} from "@/modules/messaging/email-log.repository"
import {
  recordClimateSurveyEmailOpened,
  recordClimateSurveyLinkClicked,
} from "@/modules/climate-surveys/climate-survey-analytics.service"

export interface ProcessOutboundEmailInput {
  data: SendEmailJobData
  queueJobId: string | null
}

function isClimateSurveyEmailType(type: string): boolean {
  return type === "climate_survey_dispatch" || type === "climate_survey_reminder"
}

function buildTrackingUrls(trackingToken: string): { clickUrl: string; openPixelUrl: string } {
  const base = `${env.NEXT_PUBLIC_APP_URL}/api/track/email/${trackingToken}`
  return {
    clickUrl: `${base}/click`,
    openPixelUrl: `${base}/open`,
  }
}

function resolveEmailSubject(type: SendEmailJobData["type"], orgName: string): string {
  if (type === "climate_survey_reminder") {
    return `Lembrete: pesquisa de clima ainda aberta — ${orgName}`
  }
  return `Sua pesquisa de clima — ${orgName}`
}

function renderSurveyEmailHtml(data: SendEmailJobData, trackingToken: string): string {
  const { clickUrl, openPixelUrl } = buildTrackingUrls(trackingToken)
  if (data.type === "climate_survey_reminder") {
    return renderEmailTemplate({
      name: "climate-survey-reminder",
      props: {
        employeeName: data.recipientName,
        orgName: data.orgName,
        surveyUrl: clickUrl,
        openPixelUrl,
      },
    })
  }
  return renderEmailTemplate({
    name: "climate-survey-dispatch",
    props: {
      employeeName: data.recipientName,
      orgName: data.orgName,
      surveyUrl: clickUrl,
      openPixelUrl,
      expiryHours: String(data.tokenExpiryHours),
    },
  })
}

export async function processOutboundSurveyEmail(input: ProcessOutboundEmailInput): Promise<void> {
  const trackingToken = randomUUID()
  const html = renderSurveyEmailHtml(input.data, trackingToken)
  const emailService = getEmailService()
  const subject = resolveEmailSubject(input.data.type, input.data.orgName)

  const result = await emailService.send({
    to: input.data.recipientEmail,
    subject,
    html,
  })

  const hasError = result.error !== undefined && result.error.length > 0
  const externalId = result.id.trim().length > 0 ? result.id : undefined

  await createEmailLog(input.data.tenantId, {
    employeeId: input.data.employeeId,
    type: input.data.type,
    provider: input.data.provider,
    status: hasError ? "failed" : "sent",
    recipientEmail: input.data.recipientEmail,
    surveyLink: input.data.surveyLink,
    trackingToken,
    ...(hasError ? { errorMessage: result.error, failedAt: new Date() } : {}),
    ...(externalId !== undefined ? { externalId } : {}),
    ...(input.data.dispatchId !== undefined ? { dispatchId: input.data.dispatchId } : {}),
    ...(input.queueJobId !== null ? { queueJobId: input.queueJobId } : {}),
  })
}

export async function recordOutboundSurveyEmailFinalFailure(
  data: SendEmailJobData,
  queueJobId: string | null,
  errorMessage: string,
): Promise<void> {
  if (queueJobId !== null) {
    const existing = await findEmailLogByQueueJobId(queueJobId)
    if (existing !== null) return
  }

  await createEmailLog(data.tenantId, {
    employeeId: data.employeeId,
    type: data.type,
    provider: data.provider,
    status: "failed",
    recipientEmail: data.recipientEmail,
    surveyLink: data.surveyLink,
    trackingToken: randomUUID(),
    errorMessage,
    failedAt: new Date(),
    ...(data.dispatchId !== undefined ? { dispatchId: data.dispatchId } : {}),
    ...(queueJobId !== null ? { queueJobId } : {}),
  })
}

export async function registerEmailOpen(trackingToken: string): Promise<EmailLogRecord | null> {
  const existing = await findEmailLogByTrackingToken(trackingToken)
  if (existing === null) return null
  if (existing.status === "opened" || existing.status === "clicked" || existing.openedAt !== null) {
    return existing
  }
  if (existing.status === "failed") return existing
  const updated = await markEmailLogOpened(existing.id, new Date())
  if (isClimateSurveyEmailType(updated.type)) {
    await recordClimateSurveyEmailOpened({
      tenantId: updated.tenantId,
      emailLogId: updated.id,
      dispatchId: updated.dispatchId,
    })
  }
  return updated
}

export async function registerEmailClick(trackingToken: string): Promise<EmailLogRecord | null> {
  const existing = await findEmailLogByTrackingToken(trackingToken)
  if (existing === null) return null
  if (existing.status === "clicked" && existing.clickedAt !== null) {
    return existing
  }
  if (existing.status === "failed") return existing
  const wasAlreadyOpened = existing.openedAt !== null || existing.status === "opened" || existing.status === "clicked"
  const updated = await markEmailLogClicked(existing.id, new Date(), existing.openedAt)
  if (isClimateSurveyEmailType(updated.type)) {
    if (!wasAlreadyOpened) {
      await recordClimateSurveyEmailOpened({
        tenantId: updated.tenantId,
        emailLogId: updated.id,
        dispatchId: updated.dispatchId,
      })
    }
    await recordClimateSurveyLinkClicked({
      tenantId: updated.tenantId,
      emailLogId: updated.id,
      dispatchId: updated.dispatchId,
    })
  }
  return updated
}
