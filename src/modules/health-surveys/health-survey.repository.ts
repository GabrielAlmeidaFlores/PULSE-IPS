import type { HealthSurveyConfiguration, HealthSurveyQuestion, Department, HealthSurveyDispatch, HealthSurveyResponse, HealthSurveyResponseToken, Organization, Employee, Prisma } from "@prisma/client"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { prisma } from "@/libs/db"
import { AppError } from "@/libs/errors/app-error"
import type { CreateHealthSurveyConfigInput, UpdateHealthSurveyConfigInput, CreateHealthSurveyResponseInput, CreateHealthSurveyTokenInput, CreateHealthSurveyAdherenceAlertInput } from "@/modules/health-surveys/health-survey.types"

type HealthSurveyConfigWithWorkDays = Prisma.HealthSurveyConfigurationGetPayload<{ include: { workDays: true } }>
export type HealthSurveyConfigWithDetails = HealthSurveyConfigWithWorkDays & { department: Department; questions: HealthSurveyQuestion[] }
export type HealthSurveyDispatchWithConfig = HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { department: Department } }
export type HealthSurveyDispatchWithDetails = HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { questions: HealthSurveyQuestion[] }; responses: HealthSurveyResponse[] }
export type HealthSurveyTokenWithDispatch = HealthSurveyResponseToken & { employee: Employee; dispatch: HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { questions: HealthSurveyQuestion[]; organization: Organization } } }

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

export interface HealthSurveyConfigListingFilters {
  q?: string
  frequency?: string
  departmentId?: string
}

export async function findHealthSurveyConfigsByTenantPaginated(
  tenantId: string,
  filters: HealthSurveyConfigListingFilters,
  skip: number,
  take: number,
): Promise<{ items: HealthSurveyConfigWithDetails[]; total: number }> {
  const where: Prisma.HealthSurveyConfigurationWhereInput = { tenantId, isActive: true }
  if (filters.q !== undefined && filters.q !== "") {
    where.name = { contains: filters.q, mode: "insensitive" }
  }
  if (filters.frequency !== undefined && filters.frequency !== "") {
    where.frequency = filters.frequency
  }
  if (filters.departmentId !== undefined && filters.departmentId !== "") {
    where.departmentId = filters.departmentId
  }
  const include = {
    department: true,
    questions: { where: { isActive: true }, orderBy: { order: "asc" as const } },
    workDays: true,
  }
  const [items, total] = await prisma.$transaction([
    prisma.healthSurveyConfiguration.findMany({ where, include, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.healthSurveyConfiguration.count({ where }),
  ])
  return { items: items as HealthSurveyConfigWithDetails[], total }
}

export function findHealthSurveyConfigById(tenantId: string, configId: string): Promise<HealthSurveyConfigWithDetails | null> {
  return prisma.healthSurveyConfiguration.findFirst({
    where: { id: configId, tenantId },
    include: { department: true, questions: { where: { isActive: true }, orderBy: { order: "asc" } }, workDays: true },
  })
}

export function createNewHealthSurveyConfigEntry(tenantId: string, input: CreateHealthSurveyConfigInput): Promise<HealthSurveyConfiguration & { questions: HealthSurveyQuestion[] }> {
  return prisma.healthSurveyConfiguration.create({
    data: {
      tenantId,
      departmentId: input.departmentId,
      name: input.name,
      description: input.description ?? null,
      frequency: input.frequency,
      scheduledDayOfMonth: input.scheduledDayOfMonth ?? null,
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

export function createManyHealthSurveyConfigEntries(
  tenantId: string,
  inputs: CreateHealthSurveyConfigInput[],
): Promise<void> {
  return prisma.$transaction(
    inputs.map((input) =>
      prisma.healthSurveyConfiguration.create({
        data: {
          tenantId,
          departmentId: input.departmentId,
          name: input.name,
          description: input.description ?? null,
          frequency: input.frequency,
          scheduledDayOfMonth: input.scheduledDayOfMonth ?? null,
          workStartTime: input.workStartTime,
          workEndTime: input.workEndTime,
          workDays: {
            createMany: { data: input.workDays.map((d) => ({ dayOfWeek: d })) },
          },
          questions: {
            create: input.questions.map((q) => ({ ...q, tenantId })),
          },
        },
      }),
    ),
  ).then(() => undefined)
}

export async function updateExistingHealthSurveyConfigEntry(tenantId: string, configId: string, input: UpdateHealthSurveyConfigInput): Promise<HealthSurveyConfiguration & { questions: HealthSurveyQuestion[] }> {
  const existing = await prisma.healthSurveyConfiguration.findFirst({ where: { id: configId, tenantId } })
  if (!existing) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")

  return prisma.$transaction(async (tx) => {
    const usedItems = await tx.healthSurveyResponseItem.findMany({
      where: { question: { tenantId, healthSurveyConfigurationId: configId } },
      select: { questionId: true },
      distinct: ["questionId"],
    })
    const usedQuestionIds = new Set(usedItems.map((r) => r.questionId))

    if (usedQuestionIds.size > 0) {
      await tx.healthSurveyQuestion.updateMany({
        where: { tenantId, healthSurveyConfigurationId: configId, id: { in: [...usedQuestionIds] } },
        data: { isActive: false },
      })
    }

    await tx.healthSurveyQuestion.deleteMany({
      where: { tenantId, healthSurveyConfigurationId: configId, id: { notIn: [...usedQuestionIds] } },
    })

    return tx.healthSurveyConfiguration.update({
      where: { id: configId },
      data: {
        name: input.name,
        description: input.description ?? null,
        frequency: input.frequency,
        scheduledDayOfMonth: input.scheduledDayOfMonth ?? null,
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
  })
}

export async function deactivateHealthSurveyConfigEntry(tenantId: string, configId: string): Promise<void> {
  const existing = await prisma.healthSurveyConfiguration.findFirst({ where: { id: configId, tenantId } })
  if (!existing) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")
  await prisma.healthSurveyConfiguration.update({
    where: { id: configId },
    data: { isActive: false },
  })
}

export function findHealthSurveyDispatchesByTenant(tenantId: string): Promise<HealthSurveyDispatchWithConfig[]> {
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
  configId?: string
}

function buildDispatchWhereInput(tenantId: string, filters: HealthSurveyDispatchListingFilters): Prisma.HealthSurveyDispatchWhereInput {
  const where: Prisma.HealthSurveyDispatchWhereInput = { tenantId }
  if (filters.status !== undefined) where.status = filters.status
  if (filters.configId !== undefined) where.healthSurveyConfigurationId = filters.configId
  if (filters.dateFrom !== undefined || filters.dateTo !== undefined) {
    where.scheduledAt = {
      ...(filters.dateFrom !== undefined ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo !== undefined ? { lte: filters.dateTo } : {}),
    }
  }
  return where
}

function toDateKey(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "yyyy-MM-dd")
}

export interface HealthSurveyDispatchDayPageResult {
  dates: string[]
  total: number
}

export async function findHealthSurveyDispatchDaysPaginated(
  tenantId: string,
  filters: HealthSurveyDispatchListingFilters,
  skip: number,
  take: number,
  timezone: string,
): Promise<HealthSurveyDispatchDayPageResult> {
  const where = buildDispatchWhereInput(tenantId, filters)
  const allScheduledAts = await prisma.healthSurveyDispatch.findMany({
    where,
    select: { scheduledAt: true },
    orderBy: { scheduledAt: "desc" },
  })
  const seenDates = new Set<string>()
  const distinctDates: string[] = []
  for (const { scheduledAt } of allScheduledAts) {
    const dayKey = toDateKey(new Date(scheduledAt), timezone)
    if (!seenDates.has(dayKey)) {
      seenDates.add(dayKey)
      distinctDates.push(dayKey)
    }
  }
  return { dates: distinctDates.slice(skip, skip + take), total: distinctDates.length }
}

export function findHealthSurveyDispatchesForDates(
  tenantId: string,
  dates: string[],
  filters: HealthSurveyDispatchListingFilters,
  timezone: string,
): Promise<HealthSurveyDispatchWithConfig[]> {
  if (dates.length === 0) return Promise.resolve([])
  const where: Prisma.HealthSurveyDispatchWhereInput = {
    tenantId,
    OR: dates.map((d) => ({
      scheduledAt: {
        gte: fromZonedTime(new Date(`${d}T00:00:00`), timezone),
        lte: fromZonedTime(new Date(`${d}T23:59:59`), timezone),
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

export function findHealthSurveyDispatchesByTenantFiltered(
  tenantId: string,
  filters: HealthSurveyDispatchListingFilters,
): Promise<HealthSurveyDispatchWithConfig[]> {
  return prisma.healthSurveyDispatch.findMany({
    where: buildDispatchWhereInput(tenantId, filters),
    include: { healthSurveyConfiguration: { include: { department: true } } },
    orderBy: { scheduledAt: "desc" },
  })
}

export interface HealthSurveyDispatchResponseItem {
  questionId: string
  score: number
}

export interface HealthSurveyDispatchDashboardData {
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
  signedLinkToken: string | null
  questions: { id: string; text: string; order: number; scoreDirection: string }[]
  responseItems: HealthSurveyDispatchResponseItem[]
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

export async function findHealthSurveyDispatchWithDashboard(tenantId: string, dispatchId: string): Promise<HealthSurveyDispatchDashboardData | null> {
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

  const responseItems: HealthSurveyDispatchResponseItem[] = dispatch.responses.flatMap((r) =>
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
    signedLinkToken: dispatch.signedLinkToken ?? null,
    questions,
    responseItems,
  }
}

export async function findHealthSurveyMultipleDispatchesWithDashboard(
  tenantId: string,
  dispatchIds: string[],
): Promise<HealthSurveyDispatchDashboardData[]> {
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
      signedLinkToken: dispatch.signedLinkToken ?? null,
      questions,
      responseItems: dispatch.responses.flatMap((r) =>
        r.items.map((item) => ({ questionId: item.questionId, score: item.score })),
      ),
    }
  })
}

export function findHealthSurveyDispatchById(tenantId: string, dispatchId: string): Promise<HealthSurveyDispatchWithDetails | null> {
  return prisma.healthSurveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { healthSurveyConfiguration: { include: { questions: true } }, responses: true },
  })
}

export function findAllTenantsPendingHealthSurveyDispatches(): Promise<
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
    organization: { timezone: string; billingStatus: string }
  })[]
> {
  return prisma.healthSurveyDispatch.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
      organization: { billingStatus: { in: ["active", "trialing"] } },
    },
    include: {
      healthSurveyConfiguration: {
        include: {
          workDays: true,
          questions: { orderBy: { order: "asc" } },
          department: {
            include: {
              workDays: true,
              employees: { where: { status: "active", deletedAt: null }, include: { workDays: true } },
            },
          },
        },
      },
      organization: { select: { timezone: true, billingStatus: true } },
    },
  })
}

export function findHealthSurveyTokenByValue(token: string): Promise<HealthSurveyTokenWithDispatch | null> {
  return prisma.healthSurveyResponseToken.findUnique({
    where: { token },
    include: {
      employee: true,
      dispatch: { include: { healthSurveyConfiguration: { include: { questions: { orderBy: { order: "asc" } }, organization: true } } } },
    },
  })
}

export function markHealthSurveyTokenUsed(tenantId: string, tokenId: string): Promise<HealthSurveyResponseToken> {
  return prisma.healthSurveyResponseToken.update({
    where: { id: tokenId, tenantId },
    data: { usedAt: new Date() },
  })
}

export function createHealthSurveyDispatch(
  tenantId: string,
  configId: string,
  scheduledAt: Date,
  signedLinkToken?: string,
): Promise<HealthSurveyDispatch> {
  return prisma.healthSurveyDispatch.create({
    data: {
      tenantId,
      healthSurveyConfigurationId: configId,
      scheduledAt,
      status: "scheduled",
      ...(signedLinkToken !== undefined && { signedLinkToken }),
    },
  })
}

export function deleteAllTenantsExpiredHealthSurveyTokens(): Promise<{ count: number }> {
  return prisma.healthSurveyResponseToken.deleteMany({
    where: { expiresAt: { lt: new Date() }, usedAt: null },
  })
}

export function findHealthSurveyDispatchBySignedLinkToken(
  signedLinkToken: string,
): Promise<(HealthSurveyDispatch & { healthSurveyConfiguration: HealthSurveyConfiguration & { organization: Organization; department: Department } }) | null> {
  return prisma.healthSurveyDispatch.findUnique({
    where: { signedLinkToken },
    include: { healthSurveyConfiguration: { include: { organization: true, department: true } } },
  })
}

export function findEmployeeByPhoneOrDocument(
  tenantId: string,
  identifier: string,
): Promise<Employee | null> {
  const digitsOnly = identifier.replace(/\D/g, "")
  return prisma.employee.findFirst({
    where: {
      tenantId,
      status: "active",
      deletedAt: null,
      OR: [
        { phone: { endsWith: digitsOnly } },
        { phone: identifier.trim() },
        { document: identifier.trim() },
      ],
    },
  })
}

export interface ExistingDispatchToken {
  employeeId: string
  token: string
  usedAt: Date | null
  expiresAt: Date
}

export function findExistingTokensForDispatch(
  tenantId: string,
  dispatchId: string,
  employeeIds: string[],
): Promise<ExistingDispatchToken[]> {
  if (employeeIds.length === 0) return Promise.resolve([])
  return prisma.healthSurveyResponseToken.findMany({
    where: { tenantId, dispatchId, employeeId: { in: employeeIds } },
    select: { employeeId: true, token: true, usedAt: true, expiresAt: true },
  })
}

export function findUnusedHealthSurveyTokenForEmployee(
  tenantId: string,
  dispatchId: string,
  employeeId: string,
): Promise<HealthSurveyResponseToken | null> {
  return prisma.healthSurveyResponseToken.findFirst({
    where: { tenantId, dispatchId, employeeId, usedAt: null, expiresAt: { gt: new Date() } },
  })
}

export function findUsedHealthSurveyTokenForEmployee(
  tenantId: string,
  dispatchId: string,
  employeeId: string,
): Promise<HealthSurveyResponseToken | null> {
  return prisma.healthSurveyResponseToken.findFirst({
    where: { tenantId, dispatchId, employeeId, usedAt: { not: null } },
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

export async function refreshHealthSurveyTokenWorkHours(
  tokenId: string,
  workStartTime: string,
  workEndTime: string,
): Promise<void> {
  await prisma.healthSurveyResponseToken.update({
    where: { id: tokenId },
    data: { workStartTime, workEndTime },
  })
}

export async function markHealthSurveyDispatchDispatched(tenantId: string, dispatchId: string, totalRecipients: number): Promise<void> {
  await prisma.healthSurveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { status: "available", dispatchedAt: new Date(), totalRecipients },
  })
}

export async function createHealthSurveyTokensAndMarkDispatched(
  tenantId: string,
  dispatchId: string,
  tokens: CreateHealthSurveyTokenInput[],
): Promise<void> {
  await prisma.$transaction([
    prisma.healthSurveyResponseToken.createMany({ data: tokens }),
    prisma.healthSurveyDispatch.updateMany({
      where: { id: dispatchId, tenantId },
      data: { status: "available", dispatchedAt: new Date(), totalRecipients: tokens.length },
    }),
  ])
}

export interface HealthSurveyDispatchEmployee {
  id: string
  name: string
  phone: string
  workStartTime: string | null
  workEndTime: string | null
  workDays: number[]
}

export interface HealthSurveyDispatchDepartment {
  workStartTime: string
  workEndTime: string
  workDays: number[]
  employees: HealthSurveyDispatchEmployee[]
}

export interface ActiveHealthSurveyConfigForDispatch {
  id: string
  tenantId: string
  frequency: string
  scheduledDayOfMonth: number | null
  workStartTime: string
  workEndTime: string
  workDays: number[]
  organization: { timezone: string }
  department: HealthSurveyDispatchDepartment
  questions: HealthSurveyQuestion[]
  lastDispatchedAt: Date | null
}

const ACTIVE_BILLING_STATUSES_FOR_DISPATCH = new Set(["active", "trialing"])

export async function findAllTenantsActiveHealthSurveyConfigsForAutoDispatch(): Promise<ActiveHealthSurveyConfigForDispatch[]> {
  const configs = await prisma.healthSurveyConfiguration.findMany({
    where: { isActive: true },
    include: {
      organization: { select: { timezone: true, billingStatus: true } },
      questions: { orderBy: { order: "asc" } },
      workDays: true,
      department: {
        include: {
          workDays: true,
          employees: { where: { status: "active", deletedAt: null }, include: { workDays: true } },
        },
      },
      dispatches: {
        where: { status: "available" },
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
      scheduledDayOfMonth: c.scheduledDayOfMonth,
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

export interface PendingHealthSurveyAdherenceDispatch {
  id: string
  tenantId: string
  totalRecipients: number
  healthSurveyConfiguration: { departmentId: string }
}

export function findAllTenantsHealthSurveyDispatches48hAgo(): Promise<PendingHealthSurveyAdherenceDispatch[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  return prisma.healthSurveyDispatch.findMany({
    where: { status: "available", dispatchedAt: { lte: cutoff }, adherenceCheckedAt: null },
    include: { healthSurveyConfiguration: true },
  })
}

export function countHealthSurveyResponsesForDispatch(tenantId: string, dispatchId: string): Promise<number> {
  return prisma.healthSurveyResponse.count({ where: { dispatchId, tenantId } })
}

export async function createHealthSurveyAdherenceAlert(data: CreateHealthSurveyAdherenceAlertInput): Promise<void> {
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

export async function markHealthSurveyDispatchAdherenceChecked(tenantId: string, dispatchId: string, totalResponses: number): Promise<void> {
  await prisma.healthSurveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { adherenceCheckedAt: new Date(), totalResponses },
  })
}
