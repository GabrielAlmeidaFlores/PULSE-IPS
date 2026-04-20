import type { SurveyConfiguration, SurveyQuestion, Department, SurveyDispatch, SurveyResponse, SurveyResponseToken, Organization, Employee, Prisma } from "@prisma/client"
import { prisma } from "@/libs/db"
import type { CreateSurveyConfigInput, CreateSurveyResponseInput, CreateSurveyTokenInput, CreateAdherenceAlertInput, CreateMessageLogInput } from "@/modules/surveys/survey.types"

type SurveyConfigWithWorkDays = Prisma.SurveyConfigurationGetPayload<{ include: { workDays: true } }>
export type SurveyConfigWithDetails = SurveyConfigWithWorkDays & { department: Department; questions: SurveyQuestion[] }
export type DispatchWithConfig = SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { department: Department } }
export type DispatchWithDetails = SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { questions: SurveyQuestion[] }; responses: SurveyResponse[] }
export type TokenWithDispatch = SurveyResponseToken & { dispatch: SurveyDispatch & { surveyConfiguration: SurveyConfiguration & { questions: SurveyQuestion[]; organization: Organization } } }

export function findSurveyConfigsByTenant(tenantId: string): Promise<SurveyConfigWithDetails[]> {
  return prisma.surveyConfiguration.findMany({
    where: { tenantId, isActive: true },
    include: {
      department: true,
      questions: { orderBy: { order: "asc" } },
      workDays: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export function findSurveyConfigById(tenantId: string, configId: string): Promise<SurveyConfigWithDetails | null> {
  return prisma.surveyConfiguration.findFirst({
    where: { id: configId, tenantId },
    include: { department: true, questions: { orderBy: { order: "asc" } }, workDays: true },
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
        workDays: {
          deleteMany: {},
          createMany: { data: input.workDays.map((d) => ({ dayOfWeek: d })) },
        },
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
      workDays: {
        createMany: { data: input.workDays.map((d) => ({ dayOfWeek: d })) },
      },
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

export interface DispatchResponseItem {
  questionId: string
  score: number
}

export interface DispatchDashboardData {
  id: string
  tenantId: string
  departmentId: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  totalRecipients: number
  totalResponses: number
  departmentName: string
  frequency: string
  questions: { id: string; text: string; order: number }[]
  responseItems: DispatchResponseItem[]
}

export async function findDispatchWithDashboard(tenantId: string, dispatchId: string): Promise<DispatchDashboardData | null> {
  const dispatch = await prisma.surveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: {
      surveyConfiguration: {
        include: {
          department: true,
          questions: { orderBy: { order: "asc" } },
        },
      },
      responses: {
        include: {
          items: true,
        },
      },
    },
  })

  if (!dispatch) return null

  const responseItems: DispatchResponseItem[] = dispatch.responses.flatMap((r) =>
    r.items.map((item) => ({ questionId: item.questionId, score: item.score })),
  )

  return {
    id: dispatch.id,
    tenantId: dispatch.tenantId,
    status: dispatch.status,
    scheduledAt: dispatch.scheduledAt,
    dispatchedAt: dispatch.dispatchedAt,
    totalRecipients: dispatch.totalRecipients,
    totalResponses: dispatch.totalResponses,
    departmentId: dispatch.surveyConfiguration.departmentId,
    departmentName: dispatch.surveyConfiguration.department.name,
    frequency: dispatch.surveyConfiguration.frequency,
    questions: dispatch.surveyConfiguration.questions.map((q) => ({ id: q.id, text: q.text, order: q.order })),
    responseItems,
  }
}

export async function findMultipleDispatchesWithDashboard(
  tenantId: string,
  dispatchIds: string[],
): Promise<DispatchDashboardData[]> {
  if (dispatchIds.length === 0) return []
  const dispatches = await prisma.surveyDispatch.findMany({
    where: { id: { in: dispatchIds }, tenantId },
    include: {
      surveyConfiguration: {
        include: {
          department: true,
          questions: { orderBy: { order: "asc" } },
        },
      },
      responses: { include: { items: true } },
    },
  })
  return dispatches.map((dispatch) => ({
    id: dispatch.id,
    tenantId: dispatch.tenantId,
    status: dispatch.status,
    scheduledAt: dispatch.scheduledAt,
    dispatchedAt: dispatch.dispatchedAt,
    totalRecipients: dispatch.totalRecipients,
    totalResponses: dispatch.totalResponses,
    departmentId: dispatch.surveyConfiguration.departmentId,
    departmentName: dispatch.surveyConfiguration.department.name,
    frequency: dispatch.surveyConfiguration.frequency,
    questions: dispatch.surveyConfiguration.questions.map((q) => ({ id: q.id, text: q.text, order: q.order })),
    responseItems: dispatch.responses.flatMap((r) =>
      r.items.map((item) => ({ questionId: item.questionId, score: item.score })),
    ),
  }))
}

export function findDispatchById(tenantId: string, dispatchId: string): Promise<DispatchWithDetails | null> {
  return prisma.surveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { surveyConfiguration: { include: { questions: true } }, responses: true },
  })
}

export function findPendingDispatches(): Promise<
  (SurveyDispatch & {
    surveyConfiguration: SurveyConfiguration & {
      workDays: { dayOfWeek: number }[]
      questions: SurveyQuestion[]
      department: Department & {
        workDays: { dayOfWeek: number }[]
        employees: (Employee & {
          workStartTime: string | null
          workEndTime: string | null
          workDays: { dayOfWeek: number }[]
        })[]
      }
    }
    organization: Organization
  })[]
> {
  return prisma.surveyDispatch.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date() } },
    include: {
      surveyConfiguration: {
        include: {
          workDays: true,
          questions: { orderBy: { order: "asc" } },
          department: {
            include: {
              workDays: true,
              employees: { where: { status: "active" }, include: { workDays: true } },
            },
          },
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

export interface DispatchEmployee {
  id: string
  phone: string
  workStartTime: string | null
  workEndTime: string | null
  workDays: number[]
}

export interface DispatchDepartment {
  workStartTime: string
  workEndTime: string
  workDays: number[]
  employees: DispatchEmployee[]
}

export interface ActiveConfigForDispatch {
  id: string
  tenantId: string
  frequency: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
  organization: { timezone: string }
  department: DispatchDepartment
  questions: SurveyQuestion[]
  lastDispatchedAt: Date | null
}

export async function findActiveConfigsForAutoDispatch(): Promise<ActiveConfigForDispatch[]> {
  const configs = await prisma.surveyConfiguration.findMany({
    where: { isActive: true },
    include: {
      organization: { select: { timezone: true } },
      questions: { orderBy: { order: "asc" } },
      workDays: true,
      department: {
        include: {
          workDays: true,
          employees: { where: { status: "active" }, include: { workDays: true } },
        },
      },
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
      workDays: c.workDays.map((w) => w.dayOfWeek),
      organization: c.organization,
      department: {
        workStartTime: c.department.workStartTime,
        workEndTime: c.department.workEndTime,
        workDays: c.department.workDays.map((w) => w.dayOfWeek),
        employees: c.department.employees.map((emp) => ({
          id: emp.id,
          phone: emp.phone,
          workStartTime: emp.workStartTime,
          workEndTime: emp.workEndTime,
          workDays: emp.workDays.map((w) => w.dayOfWeek),
        })),
      },
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
