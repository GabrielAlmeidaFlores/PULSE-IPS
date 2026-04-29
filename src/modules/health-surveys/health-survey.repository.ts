import type { HealthSurveyConfiguration, HealthSurveyQuestion, Department, HealthSurveyDispatch, HealthSurveyResponse, HealthSurveyResponseToken, Organization, Employee, Prisma } from "@prisma/client"
import { prisma } from "@/libs/db"
import { AppError } from "@/libs/errors/app-error"
import type { CreateHealthSurveyConfigInput, CreateHealthSurveyResponseInput, CreateHealthSurveyTokenInput, CreateAdherenceAlertInput, CreateMessageLogInput } from "@/modules/health-surveys/health-survey.types"

type HealthSurveyConfigWithWorkDays = Prisma.HealthSurveyConfigurationGetPayload<{ include: { workDays: true } }>
export type HealthSurveyConfigWithDetails = HealthSurveyConfigWithWorkDays & { department: Department; questions: HealthSurveyQuestion[] }
export type DispatchWithConfig = HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { department: Department } }
export type DispatchWithDetails = HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { questions: HealthSurveyQuestion[] }; responses: HealthSurveyResponse[] }
export type TokenWithDispatch = HealthSurveyResponseToken & { employee: Employee; dispatch: HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { questions: HealthSurveyQuestion[]; organization: Organization } } }

export function findHealthSurveyConfigsByTenant(tenantId: string): Promise<HealthSurveyConfigWithDetails[]> {
  return prisma.healthSurveyConfiguration.findMany({
    where: { tenantId, isActive: true },
    include: {
      department: true,
      questions: { where: { isActive: true }, orderBy: { order: "asc" } },
      workDays: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export function findHealthSurveyConfigById(tenantId: string, configId: string): Promise<HealthSurveyConfigWithDetails | null> {
  return prisma.healthSurveyConfiguration.findFirst({
    where: { id: configId, tenantId },
    include: { department: true, questions: { where: { isActive: true }, orderBy: { order: "asc" } }, workDays: true },
  })
}

export async function upsertHealthSurveyConfig(tenantId: string, input: CreateHealthSurveyConfigInput): Promise<HealthSurveyConfiguration & { questions: HealthSurveyQuestion[] }> {
  const existing = await prisma.healthSurveyConfiguration.findFirst({
    where: { tenantId, departmentId: input.departmentId },
  })

  if (existing) {
    const usedItems = await prisma.healthSurveyResponseItem.findMany({
      where: { question: { tenantId, healthSurveyConfigurationId: existing.id } },
      select: { questionId: true },
      distinct: ["questionId"],
    })
    const usedQuestionIds = new Set(usedItems.map((r) => r.questionId))

    if (usedQuestionIds.size > 0) {
      await prisma.healthSurveyQuestion.updateMany({
        where: { tenantId, healthSurveyConfigurationId: existing.id, id: { in: [...usedQuestionIds] } },
        data: { isActive: false },
      })
    }

    await prisma.healthSurveyQuestion.deleteMany({
      where: { tenantId, healthSurveyConfigurationId: existing.id, id: { notIn: [...usedQuestionIds] } },
    })

    return prisma.healthSurveyConfiguration.update({
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
      include: { questions: { where: { isActive: true }, orderBy: { order: "asc" } } },
    })
  }

  return prisma.healthSurveyConfiguration.create({
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
  return prisma.healthSurveyDispatch.findMany({
    where: { tenantId },
    include: { healthSurveyConfiguration: { include: { department: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 300,
  })
}

export interface HealthSurveyDispatchListingFilters {
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

function buildDispatchWhereInput(tenantId: string, filters: HealthSurveyDispatchListingFilters): Prisma.HealthSurveyDispatchWhereInput {
  const where: Prisma.HealthSurveyDispatchWhereInput = { tenantId }
  if (filters.status !== undefined) where.status = filters.status
  if (filters.dateFrom !== undefined || filters.dateTo !== undefined) {
    where.scheduledAt = {
      ...(filters.dateFrom !== undefined ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo !== undefined ? { lte: filters.dateTo } : {}),
    }
  }
  return where
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export interface DispatchDayPageResult {
  dates: string[]
  total: number
}

export async function findDispatchDaysPaginated(
  tenantId: string,
  filters: HealthSurveyDispatchListingFilters,
  skip: number,
  take: number,
): Promise<DispatchDayPageResult> {
  const where = buildDispatchWhereInput(tenantId, filters)
  const allScheduledAts = await prisma.healthSurveyDispatch.findMany({
    where,
    select: { scheduledAt: true },
    orderBy: { scheduledAt: "desc" },
  })
  const seenDates = new Set<string>()
  const distinctDates: string[] = []
  for (const { scheduledAt } of allScheduledAts) {
    const dayKey = toDateKey(new Date(scheduledAt))
    if (!seenDates.has(dayKey)) {
      seenDates.add(dayKey)
      distinctDates.push(dayKey)
    }
  }
  return { dates: distinctDates.slice(skip, skip + take), total: distinctDates.length }
}

export function findDispatchesForDates(
  tenantId: string,
  dates: string[],
  filters: HealthSurveyDispatchListingFilters,
): Promise<DispatchWithConfig[]> {
  if (dates.length === 0) return Promise.resolve([])
  const where: Prisma.HealthSurveyDispatchWhereInput = {
    tenantId,
    OR: dates.map((d) => ({
      scheduledAt: {
        gte: new Date(`${d}T00:00:00`),
        lte: new Date(`${d}T23:59:59`),
      },
    })),
  }
  if (filters.status !== undefined) where.status = filters.status
  return prisma.healthSurveyDispatch.findMany({
    where,
    include: { healthSurveyConfiguration: { include: { department: true } } },
    orderBy: { scheduledAt: "desc" },
  })
}

export function findDispatchesByTenantFiltered(
  tenantId: string,
  filters: HealthSurveyDispatchListingFilters,
): Promise<DispatchWithConfig[]> {
  return prisma.healthSurveyDispatch.findMany({
    where: buildDispatchWhereInput(tenantId, filters),
    include: { healthSurveyConfiguration: { include: { department: true } } },
    orderBy: { scheduledAt: "desc" },
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
  questions: { id: string; text: string; order: number; scoreDirection: string }[]
  responseItems: DispatchResponseItem[]
}

interface QuestionSnapshot { id: string; text: string; order: number; scoreDirection: string }

function extractQuestionsFromResponses(
  responses: { items: { questionId: string; score: number; question: QuestionSnapshot }[] }[],
  fallbackQuestions: QuestionSnapshot[],
): QuestionSnapshot[] {
  const seen = new Map<string, QuestionSnapshot>()
  for (const response of responses) {
    for (const item of response.items) {
      if (!seen.has(item.questionId)) {
        seen.set(item.questionId, { id: item.question.id, text: item.question.text, order: item.question.order, scoreDirection: item.question.scoreDirection })
      }
    }
  }
  if (seen.size === 0) return fallbackQuestions
  return Array.from(seen.values()).sort((a, b) => a.order - b.order)
}

export async function findDispatchWithDashboard(tenantId: string, dispatchId: string): Promise<DispatchDashboardData | null> {
  const dispatch = await prisma.healthSurveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: {
      healthSurveyConfiguration: {
        include: {
          department: true,
          questions: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
      responses: {
        include: {
          items: { include: { question: true } },
        },
      },
    },
  })

  if (!dispatch) return null

  const configQuestions = dispatch.healthSurveyConfiguration.questions.map((q) => ({ id: q.id, text: q.text, order: q.order, scoreDirection: q.scoreDirection }))
  const questions = extractQuestionsFromResponses(dispatch.responses, configQuestions)

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
    totalResponses: dispatch.responses.length,
    departmentId: dispatch.healthSurveyConfiguration.departmentId,
    departmentName: dispatch.healthSurveyConfiguration.department.name,
    frequency: dispatch.healthSurveyConfiguration.frequency,
    questions,
    responseItems,
  }
}

export async function findMultipleDispatchesWithDashboard(
  tenantId: string,
  dispatchIds: string[],
): Promise<DispatchDashboardData[]> {
  if (dispatchIds.length === 0) return []
  const dispatches = await prisma.healthSurveyDispatch.findMany({
    where: { id: { in: dispatchIds }, tenantId },
    include: {
      healthSurveyConfiguration: {
        include: {
          department: true,
          questions: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
      responses: { include: { items: { include: { question: true } } } },
    },
  })
  return dispatches.map((dispatch) => {
    const configQuestions = dispatch.healthSurveyConfiguration.questions.map((q) => ({ id: q.id, text: q.text, order: q.order, scoreDirection: q.scoreDirection }))
    const questions = extractQuestionsFromResponses(dispatch.responses, configQuestions)
    return {
      id: dispatch.id,
      tenantId: dispatch.tenantId,
      status: dispatch.status,
      scheduledAt: dispatch.scheduledAt,
      dispatchedAt: dispatch.dispatchedAt,
      totalRecipients: dispatch.totalRecipients,
      totalResponses: dispatch.responses.length,
      departmentId: dispatch.healthSurveyConfiguration.departmentId,
      departmentName: dispatch.healthSurveyConfiguration.department.name,
      frequency: dispatch.healthSurveyConfiguration.frequency,
      questions,
      responseItems: dispatch.responses.flatMap((r) =>
        r.items.map((item) => ({ questionId: item.questionId, score: item.score })),
      ),
    }
  })
}

export function findDispatchById(tenantId: string, dispatchId: string): Promise<DispatchWithDetails | null> {
  return prisma.healthSurveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { healthSurveyConfiguration: { include: { questions: true } }, responses: true },
  })
}

export function findAllTenantsPendingDispatches(): Promise<
  (HealthSurveyDispatch & {
    healthSurveyConfiguration: HealthSurveyConfiguration & {
      workDays: { dayOfWeek: number }[]
      questions: HealthSurveyQuestion[]
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
  return prisma.healthSurveyDispatch.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date() } },
    include: {
      healthSurveyConfiguration: {
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
  return prisma.healthSurveyResponseToken.findUnique({
    where: { token },
    include: {
      employee: true,
      dispatch: { include: { healthSurveyConfiguration: { include: { questions: { orderBy: { order: "asc" } }, organization: true } } } },
    },
  })
}

export function markTokenUsed(tenantId: string, tokenId: string): Promise<HealthSurveyResponseToken> {
  return prisma.healthSurveyResponseToken.update({
    where: { id: tokenId, tenantId },
    data: { usedAt: new Date() },
  })
}

export function createDispatch(
  tenantId: string,
  configId: string,
  scheduledAt: Date,
): Promise<HealthSurveyDispatch> {
  return prisma.healthSurveyDispatch.create({
    data: {
      tenantId,
      healthSurveyConfigurationId: configId,
      scheduledAt,
      status: "scheduled",
    },
  })
}

export function deleteAllTenantsExpiredHealthSurveyTokens(): Promise<{ count: number }> {
  return prisma.healthSurveyResponseToken.deleteMany({
    where: { expiresAt: { lt: new Date() }, usedAt: null },
  })
}

export async function createHealthSurveyResponseWithItems(data: CreateHealthSurveyResponseInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.healthSurveyResponseToken.updateMany({
      where: { id: data.tokenId, usedAt: null },
      data: { usedAt: new Date() },
    })

    if (claimed.count === 0) {
      throw new AppError("SURVEY_ALREADY_ANSWERED", "Esta pesquisa já foi respondida.")
    }

    await tx.healthSurveyResponse.create({
      data: {
        tenantId: data.tenantId,
        dispatchId: data.dispatchId,
        items: {
          create: data.answers.map((a) => ({
            questionId: a.questionId,
            score: a.score,
          })),
        },
      },
    })

    await tx.healthSurveyDispatch.update({
      where: { id: data.dispatchId },
      data: { totalResponses: { increment: 1 } },
    })
  })
}

export async function createHealthSurveyTokens(tokens: CreateHealthSurveyTokenInput[]): Promise<void> {
  await prisma.healthSurveyResponseToken.createMany({ data: tokens })
}

export async function markDispatchSent(tenantId: string, dispatchId: string, totalRecipients: number): Promise<void> {
  await prisma.healthSurveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { status: "sent", dispatchedAt: new Date(), totalRecipients },
  })
}

export async function createHealthSurveyTokensAndMarkSent(
  tenantId: string,
  dispatchId: string,
  tokens: CreateHealthSurveyTokenInput[],
): Promise<void> {
  await prisma.$transaction([
    prisma.healthSurveyResponseToken.createMany({ data: tokens }),
    prisma.healthSurveyDispatch.updateMany({
      where: { id: dispatchId, tenantId },
      data: { status: "sent", dispatchedAt: new Date(), totalRecipients: tokens.length },
    }),
  ])
}

export interface DispatchEmployee {
  id: string
  name: string
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
  questions: HealthSurveyQuestion[]
  lastDispatchedAt: Date | null
}

const ACTIVE_BILLING_STATUSES_FOR_DISPATCH = new Set(["active", "trialing"])

export async function findAllTenantsActiveHealthSurveyConfigsForAutoDispatch(): Promise<ActiveConfigForDispatch[]> {
  const configs = await prisma.healthSurveyConfiguration.findMany({
    where: { isActive: true },
    include: {
      organization: { select: { timezone: true, billingStatus: true } },
      questions: { orderBy: { order: "asc" } },
      workDays: true,
      department: {
        include: {
          workDays: true,
          employees: { where: { status: "active" }, include: { workDays: true } },
        },
      },
      dispatches: {
        where: { status: "sent" },
        orderBy: { dispatchedAt: "desc" },
        take: 1,
        select: { dispatchedAt: true },
      },
    },
  })
  return configs
    .filter((c) => c.department.employees.length > 0 && ACTIVE_BILLING_STATUSES_FOR_DISPATCH.has(c.organization.billingStatus))
    .map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      frequency: c.frequency,
      workStartTime: c.workStartTime,
      workEndTime: c.workEndTime,
      workDays: c.workDays.map((w) => w.dayOfWeek),
      organization: { timezone: c.organization.timezone },
      department: {
        workStartTime: c.department.workStartTime,
        workEndTime: c.department.workEndTime,
        workDays: c.department.workDays.map((w) => w.dayOfWeek),
        employees: c.department.employees.map((emp) => ({
          id: emp.id,
          name: emp.name,
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
  healthSurveyConfiguration: { departmentId: string }
}

export function findAllTenantsDispatches48hAgo(): Promise<PendingAdherenceDispatch[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  return prisma.healthSurveyDispatch.findMany({
    where: { status: "sent", dispatchedAt: { lte: cutoff }, adherenceCheckedAt: null },
    include: { healthSurveyConfiguration: true },
  })
}

export function countResponsesForDispatch(tenantId: string, dispatchId: string): Promise<number> {
  return prisma.healthSurveyResponse.count({ where: { dispatchId, tenantId } })
}

export async function createAdherenceAlert(data: CreateAdherenceAlertInput): Promise<void> {
  const isLowAdherence = data.adherenceRate >= 0.5 && data.adherenceRate < 0.8
  const isNoResponse = data.adherenceRate < 0.5

  if (isNoResponse) {
    await prisma.alert.create({
      data: {
        tenantId: data.tenantId,
        departmentId: data.departmentId,
        type: "no_response",
        severity: data.adherenceRate < 0.25 ? "critical" : "warning",
        message: `Taxa de adesão: ${Math.round(data.adherenceRate * 100)}% (${data.responseCount}/${data.totalRecipients})`,
      },
    })
    return
  }

  if (isLowAdherence) {
    await prisma.alert.create({
      data: {
        tenantId: data.tenantId,
        departmentId: data.departmentId,
        type: "low_adherence",
        severity: "warning",
        message: `Taxa de adesão: ${Math.round(data.adherenceRate * 100)}% (${data.responseCount}/${data.totalRecipients})`,
      },
    })
  }
}

export async function markDispatchAdherenceChecked(tenantId: string, dispatchId: string, totalResponses: number): Promise<void> {
  await prisma.healthSurveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { adherenceCheckedAt: new Date(), totalResponses },
  })
}

export async function createMessageLog(data: CreateMessageLogInput): Promise<void> {
  await prisma.messageLog.create({ data })
}
