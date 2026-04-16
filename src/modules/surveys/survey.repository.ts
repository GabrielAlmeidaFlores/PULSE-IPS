import type { SurveyConfiguration, SurveyQuestion, Department, SurveyDispatch, SurveyResponse, SurveyResponseToken, Organization, Employee } from "@prisma/client"
import { prisma } from "@/libs/db"
import type { CreateSurveyConfigInput, CreateSurveyResponseInput, CreateSurveyTokenInput, CreateAdherenceAlertInput, CreateMessageLogInput } from "@/modules/surveys/survey.types"

export type SurveyConfigWithDetails = SurveyConfiguration & { department: Department; questions: SurveyQuestion[] }
export type DispatchWithConfig = SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { department: Department } }
export type DispatchWithDetails = SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { questions: SurveyQuestion[] }; responses: SurveyResponse[] }
export type TokenWithDispatch = SurveyResponseToken & { dispatch: SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { questions: SurveyQuestion[]; organization: Organization } } }

export function findSurveyConfigsByTenant(tenantId: string): Promise<SurveyConfigWithDetails[]> {
  return prisma.surveyConfiguration.findMany({
    where: { tenantId, isActive: true },
    include: {
      department: true,
      questions: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export function findSurveyConfigById(tenantId: string, configId: string): Promise<SurveyConfigWithDetails | null> {
  return prisma.surveyConfiguration.findFirst({
    where: { id: configId, tenantId },
    include: { department: true, questions: { orderBy: { order: "asc" } } },
  })
}

export async function upsertSurveyConfig(tenantId: string, input: CreateSurveyConfigInput): Promise<SurveyConfiguration & { questions: SurveyQuestion[] }> {
  const existing = await prisma.surveyConfiguration.findFirst({
    where: { tenantId, departmentId: input.departmentId },
  })

  if (existing) {
    await prisma.surveyQuestion.deleteMany({
      where: { surveyConfigurationId: existing.id, tenantId },
    })
    return prisma.surveyConfiguration.update({
      where: { id: existing.id },
      data: {
        frequency: input.frequency,
        workStartTime: input.workStartTime,
        workEndTime: input.workEndTime,
        workDays: input.workDays,
        questions: {
          create: input.questions.map((q) => ({ ...q, tenantId })),
        },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    })
  }

  return prisma.surveyConfiguration.create({
    data: {
      tenantId,
      departmentId: input.departmentId,
      frequency: input.frequency,
      workStartTime: input.workStartTime,
      workEndTime: input.workEndTime,
      workDays: input.workDays,
      questions: {
        create: input.questions.map((q) => ({ ...q, tenantId })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  })
}

export function findDispatchesByTenant(tenantId: string): Promise<DispatchWithConfig[]> {
  return prisma.surveyDispatch.findMany({
    where: { tenantId },
    include: { surveyConfiguration: { include: { department: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  })
}

export function findDispatchById(tenantId: string, dispatchId: string): Promise<DispatchWithDetails | null> {
  return prisma.surveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { surveyConfiguration: { include: { questions: true } }, responses: true },
  })
}

export function findPendingDispatches(): Promise<(SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { questions: SurveyQuestion[]; department: Department & { employees: (Employee & { workStartTime: string | null; workEndTime: string | null })[] } }; organization: Organization })[]> {
  return prisma.surveyDispatch.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date() } },
    include: {
      surveyConfiguration: {
        include: {
          questions: { orderBy: { order: "asc" } },
          department: { include: { employees: { where: { status: "active" } } } },
        },
      },
      organization: true,
    },
  })
}

export function findTokenByValue(token: string): Promise<TokenWithDispatch | null> {
  return prisma.surveyResponseToken.findUnique({
    where: { token },
    include: { dispatch: { include: { surveyConfiguration: { include: { questions: { orderBy: { order: "asc" } }, organization: true } } } } },
  })
}

export function markTokenUsed(tokenId: string): Promise<SurveyResponseToken> {
  return prisma.surveyResponseToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  })
}

export function createDispatch(
  tenantId: string,
  configId: string,
  scheduledAt: Date,
): Promise<SurveyDispatch> {
  return prisma.surveyDispatch.create({
    data: {
      tenantId,
      surveyConfigurationId: configId,
      scheduledAt,
      status: "scheduled",
    },
  })
}

export function deleteExpiredTokens(): Promise<{ count: number }> {
  return prisma.surveyResponseToken.deleteMany({
    where: { expiresAt: { lt: new Date() }, usedAt: null },
  })
}

export async function createSurveyResponseWithItems(data: CreateSurveyResponseInput): Promise<void> {
  await prisma.$transaction([
    prisma.surveyResponse.create({
      data: {
        tenantId: data.tenantId,
        dispatchId: data.dispatchId,
        tokenId: data.tokenId,
        items: {
          create: data.answers.map((a) => ({
            questionId: a.questionId,
            score: a.score,
          })),
        },
      },
    }),
    prisma.surveyResponseToken.update({
      where: { id: data.tokenId },
      data: { usedAt: new Date() },
    }),
    prisma.surveyDispatch.update({
      where: { id: data.dispatchId },
      data: { totalResponses: { increment: 1 } },
    }),
  ])
}

export async function createSurveyTokens(tokens: CreateSurveyTokenInput[]): Promise<void> {
  await prisma.surveyResponseToken.createMany({ data: tokens })
}

export async function markDispatchSent(tenantId: string, dispatchId: string, totalRecipients: number): Promise<void> {
  await prisma.surveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { status: "dispatched", dispatchedAt: new Date(), totalRecipients },
  })
}

export interface ActiveConfigForDispatch {
  id: string
  tenantId: string
  frequency: string
  workStartTime: string
  workEndTime: string
  workDays: string
  organization: { timezone: string }
  department: Department & { employees: (Employee & { workStartTime: string | null; workEndTime: string | null })[] }
  questions: SurveyQuestion[]
  lastDispatchedAt: Date | null
}

export async function findActiveConfigsForAutoDispatch(): Promise<ActiveConfigForDispatch[]> {
  const configs = await prisma.surveyConfiguration.findMany({
    where: { isActive: true },
    include: {
      organization: { select: { timezone: true } },
      questions: { orderBy: { order: "asc" } },
      department: { include: { employees: { where: { status: "active" } } } },
      dispatches: {
        where: { status: "dispatched" },
        orderBy: { dispatchedAt: "desc" },
        take: 1,
        select: { dispatchedAt: true },
      },
    },
  })
  return configs
    .filter((c) => c.department.employees.length > 0)
    .map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      frequency: c.frequency,
      workStartTime: c.workStartTime,
      workEndTime: c.workEndTime,
      workDays: c.workDays,
      organization: c.organization,
      department: c.department as Department & { employees: (Employee & { workStartTime: string | null; workEndTime: string | null })[] },
      questions: c.questions,
      lastDispatchedAt: c.dispatches[0]?.dispatchedAt ?? null,
    }))
}

export interface PendingAdherenceDispatch {
  id: string
  tenantId: string
  totalRecipients: number
  surveyConfiguration: { departmentId: string }
}

export function findDispatches48hAgo(): Promise<PendingAdherenceDispatch[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  return prisma.surveyDispatch.findMany({
    where: { status: "dispatched", dispatchedAt: { lte: cutoff }, adherenceCheckedAt: null },
    include: { surveyConfiguration: true },
  })
}

export function countResponsesForDispatch(tenantId: string, dispatchId: string): Promise<number> {
  return prisma.surveyResponse.count({ where: { dispatchId, tenantId } })
}

export async function createAdherenceAlert(data: CreateAdherenceAlertInput): Promise<void> {
  await prisma.alert.create({
    data: {
      tenantId: data.tenantId,
      departmentId: data.departmentId,
      type: "no_response",
      severity: data.adherenceRate < 0.25 ? "critical" : "warning",
      message: `Taxa de adesão: ${Math.round(data.adherenceRate * 100)}% (${data.responseCount}/${data.totalRecipients})`,
    },
  })
}

export async function markDispatchAdherenceChecked(tenantId: string, dispatchId: string, totalResponses: number): Promise<void> {
  await prisma.surveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { adherenceCheckedAt: new Date(), totalResponses },
  })
}

export async function createMessageLog(data: CreateMessageLogInput): Promise<void> {
  await prisma.messageLog.create({ data })
}
