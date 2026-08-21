import { prisma } from "@/libs/db"
import type {
  ClimateSurveyAnalyticsEventRecord,
  ClimateSurveyResponseSessionRecord,
  CreateClimateSurveyResponseSessionInput,
  RecordClimateSurveyAnalyticsEventInput,
  UpdateClimateSurveyResponseSessionProgressInput,
} from "@/modules/climate-surveys/climate-survey-analytics.types"

export function insertClimateSurveyAnalyticsEvent(
  tenantId: string,
  input: RecordClimateSurveyAnalyticsEventInput,
): Promise<ClimateSurveyAnalyticsEventRecord> {
  return prisma.climateSurveyAnalyticsEvent.create({
    data: {
      tenantId,
      event: input.event,
      quantity: input.quantity ?? 1,
      ...(input.configId !== undefined ? { configId: input.configId } : {}),
      ...(input.dispatchId !== undefined ? { dispatchId: input.dispatchId } : {}),
      ...(input.actionPlanId !== undefined ? { actionPlanId: input.actionPlanId } : {}),
      ...(input.questionId !== undefined ? { questionId: input.questionId } : {}),
      ...(input.questionOrder !== undefined ? { questionOrder: input.questionOrder } : {}),
      ...(input.emailLogId !== undefined ? { emailLogId: input.emailLogId } : {}),
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
    },
  })
}

export async function insertClimateSurveyAnalyticsEvents(
  tenantId: string,
  inputs: RecordClimateSurveyAnalyticsEventInput[],
): Promise<void> {
  if (inputs.length === 0) return
  await prisma.climateSurveyAnalyticsEvent.createMany({
    data: inputs.map((input) => ({
      tenantId,
      event: input.event,
      quantity: input.quantity ?? 1,
      ...(input.configId !== undefined ? { configId: input.configId } : {}),
      ...(input.dispatchId !== undefined ? { dispatchId: input.dispatchId } : {}),
      ...(input.actionPlanId !== undefined ? { actionPlanId: input.actionPlanId } : {}),
      ...(input.questionId !== undefined ? { questionId: input.questionId } : {}),
      ...(input.questionOrder !== undefined ? { questionOrder: input.questionOrder } : {}),
      ...(input.emailLogId !== undefined ? { emailLogId: input.emailLogId } : {}),
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
    })),
  })
}

export function findClimateSurveyResponseSessionByTokenId(
  tenantId: string,
  tokenId: string,
): Promise<ClimateSurveyResponseSessionRecord | null> {
  return prisma.climateSurveyResponseSession.findFirst({
    where: { tenantId, tokenId },
  })
}

export function createClimateSurveyResponseSession(
  tenantId: string,
  input: CreateClimateSurveyResponseSessionInput,
): Promise<ClimateSurveyResponseSessionRecord> {
  return prisma.climateSurveyResponseSession.create({
    data: {
      tenantId,
      dispatchId: input.dispatchId,
      tokenId: input.tokenId,
      questionCount: input.questionCount,
      startedAt: input.startedAt,
    },
  })
}

export async function updateClimateSurveyResponseSessionProgress(
  tenantId: string,
  sessionId: string,
  input: UpdateClimateSurveyResponseSessionProgressInput,
): Promise<ClimateSurveyResponseSessionRecord | null> {
  const existing = await prisma.climateSurveyResponseSession.findFirst({
    where: { id: sessionId, tenantId, completedAt: null },
  })
  if (existing === null) return null
  return prisma.climateSurveyResponseSession.update({
    where: { id: sessionId },
    data: {
      lastQuestionId: input.lastQuestionId,
      lastQuestionOrder: input.lastQuestionOrder,
    },
  })
}

export async function completeClimateSurveyResponseSession(
  tenantId: string,
  sessionId: string,
  completedAt: Date,
): Promise<ClimateSurveyResponseSessionRecord | null> {
  const existing = await prisma.climateSurveyResponseSession.findFirst({
    where: { id: sessionId, tenantId },
  })
  if (existing === null) return null
  if (existing.completedAt !== null) return existing
  return prisma.climateSurveyResponseSession.update({
    where: { id: sessionId },
    data: { completedAt },
  })
}

export async function completeClimateSurveyResponseSessionByTokenId(
  tenantId: string,
  tokenId: string,
  completedAt: Date,
): Promise<ClimateSurveyResponseSessionRecord | null> {
  const existing = await findClimateSurveyResponseSessionByTokenId(tenantId, tokenId)
  if (existing === null) return null
  return completeClimateSurveyResponseSession(tenantId, existing.id, completedAt)
}

export interface ClimateSurveyEmailFunnelCounts {
  sent: number
  opened: number
  clicked: number
}

export async function countClimateSurveyEmailFunnelByDispatch(
  tenantId: string,
  dispatchId: string,
): Promise<ClimateSurveyEmailFunnelCounts> {
  const logs = await prisma.emailLog.findMany({
    where: {
      tenantId,
      dispatchId,
      type: { in: ["climate_survey_dispatch", "climate_survey_reminder"] },
      status: { not: "failed" },
    },
    select: {
      status: true,
      openedAt: true,
      clickedAt: true,
    },
  })

  let opened = 0
  let clicked = 0
  for (const log of logs) {
    if (log.clickedAt !== null || log.status === "clicked") {
      clicked += 1
      opened += 1
      continue
    }
    if (log.openedAt !== null || log.status === "opened") {
      opened += 1
    }
  }

  return { sent: logs.length, opened, clicked }
}

export async function sumClimateSurveyDeptDispatchRecipients(
  tenantId: string,
  dispatchId: string,
): Promise<number> {
  const rows = await prisma.climateSurveyDeptDispatch.findMany({
    where: { dispatchId, dispatch: { tenantId } },
    select: { totalRecipients: true },
  })
  return rows.reduce((sum, row) => sum + row.totalRecipients, 0)
}

export function findClimateSurveyResponseSessionsByDispatch(
  tenantId: string,
  dispatchId: string,
): Promise<ClimateSurveyResponseSessionRecord[]> {
  return prisma.climateSurveyResponseSession.findMany({
    where: { tenantId, dispatchId },
  })
}
