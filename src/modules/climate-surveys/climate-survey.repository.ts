import type { ClimateSurveyConfiguration, ClimateSurveyQuestion, Department, ClimateSurveyDispatch, ClimateSurveyResponse, ClimateSurveyResponseToken, Organization, Employee, Prisma } from "@prisma/client"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { prisma } from "@/libs/db"
import { AppError } from "@/libs/errors/app-error"
import { toAnonymousSurveyResponseDate } from "@/libs/utils/anonymity"
import { normalizePhoneToE164 } from "@/libs/utils/phone"
import type { CreateClimateSurveyConfigInput, UpdateClimateSurveyConfigInput, CreateClimateSurveyResponseInput, CreateClimateSurveyTokenInput, CreateClimateSurveyAdherenceAlertInput } from "@/modules/climate-surveys/climate-survey.types"

type ClimateSurveyConfigWithWorkDays = Prisma.ClimateSurveyConfigurationGetPayload<{ include: { workDays: true } }>
export type ClimateSurveyConfigWithDetails = ClimateSurveyConfigWithWorkDays & {
  configDepartments: { department: Department }[]
  questions: ClimateSurveyQuestion[]
}
export type ClimateSurveyDispatchWithConfig = ClimateSurveyDispatch & {
  climateSurveyConfiguration: ClimateSurveyConfiguration & {
    configDepartments: { department: Department }[]
  }
  deptDispatches: { departmentId: string; totalRecipients: number; totalResponses: number }[]
}
export type ClimateSurveyDispatchWithDetails = ClimateSurveyDispatch & {
  climateSurveyConfiguration: ClimateSurveyConfiguration & { questions: ClimateSurveyQuestion[] }
  responses: ClimateSurveyResponse[]
}
export type ClimateSurveyTokenWithDispatch = ClimateSurveyResponseToken & {
  employee: Employee
  dispatch: ClimateSurveyDispatch & {
    climateSurveyConfiguration: ClimateSurveyConfiguration & {
      questions: ClimateSurveyQuestion[]
      organization: Organization
    }
  }
}

const CONFIG_WITH_DETAILS_INCLUDE = {
  configDepartments: { include: { department: true } },
  questions: { where: { isActive: true }, orderBy: { order: "asc" as const } },
  workDays: true,
} as const

const DISPATCH_WITH_CONFIG_INCLUDE = {
  climateSurveyConfiguration: { include: { configDepartments: { include: { department: true } } } },
  deptDispatches: { select: { departmentId: true, totalRecipients: true, totalResponses: true } },
} as const

export function findClimateSurveyConfigsByTenant(tenantId: string): Promise<ClimateSurveyConfigWithDetails[]> {
  return prisma.climateSurveyConfiguration.findMany({
    where: { tenantId, isActive: true },
    include: CONFIG_WITH_DETAILS_INCLUDE,
    orderBy: { createdAt: "desc" },
  })
}

export interface ClimateSurveyConfigListingFilters {
  q?: string
  frequency?: string
  departmentId?: string
}

export async function findClimateSurveyConfigsByTenantPaginated(
  tenantId: string,
  filters: ClimateSurveyConfigListingFilters,
  skip: number,
  take: number,
): Promise<{ items: ClimateSurveyConfigWithDetails[]; total: number }> {
  const where: Prisma.ClimateSurveyConfigurationWhereInput = { tenantId, isActive: true }
  if (filters.q !== undefined) {
    where.name = { contains: filters.q, mode: "insensitive" }
  }
  if (filters.frequency !== undefined) {
    where.frequency = filters.frequency
  }
  if (filters.departmentId !== undefined) {
    where.configDepartments = { some: { departmentId: filters.departmentId } }
  }
  const [items, total] = await prisma.$transaction([
    prisma.climateSurveyConfiguration.findMany({ where, include: CONFIG_WITH_DETAILS_INCLUDE, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.climateSurveyConfiguration.count({ where }),
  ])
  return { items: items as ClimateSurveyConfigWithDetails[], total }
}

export function findClimateSurveyConfigById(tenantId: string, configId: string): Promise<ClimateSurveyConfigWithDetails | null> {
  return prisma.climateSurveyConfiguration.findFirst({
    where: { id: configId, tenantId },
    include: CONFIG_WITH_DETAILS_INCLUDE,
  })
}

export function createNewClimateSurveyConfigEntry(
  tenantId: string,
  input: CreateClimateSurveyConfigInput,
): Promise<ClimateSurveyConfiguration & { questions: ClimateSurveyQuestion[] }> {
  return prisma.climateSurveyConfiguration.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description ?? null,
      frequency: input.frequency,
      scheduledDayOfMonth: input.scheduledDayOfMonth ?? null,
      dispatchTime: input.dispatchTime,
      workDays: {
        createMany: { data: input.workDays.map((d) => ({ dayOfWeek: d })) },
      },
      respectEmployeeSchedule: input.respectEmployeeSchedule,
      tokenExpiryHours: input.tokenExpiryHours,
      sendViaMessaging: input.sendViaMessaging,
      sendViaSignedLink: input.sendViaSignedLink,
      configDepartments: {
        createMany: { data: input.departmentIds.map((departmentId) => ({ departmentId })) },
      },
      questions: {
        create: input.questions.map((q) => ({ ...q, tenantId })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  })
}

export async function updateExistingClimateSurveyConfigEntry(
  tenantId: string,
  configId: string,
  input: UpdateClimateSurveyConfigInput,
): Promise<ClimateSurveyConfiguration & { questions: ClimateSurveyQuestion[] }> {
  const existing = await prisma.climateSurveyConfiguration.findFirst({ where: { id: configId, tenantId } })
  if (!existing) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")

  return prisma.$transaction(async (tx) => {
    const usedItems = await tx.climateSurveyResponseItem.findMany({
      where: { question: { tenantId, climateSurveyConfigurationId: configId } },
      select: { questionId: true },
      distinct: ["questionId"],
    })
    const usedQuestionIds = new Set(usedItems.map((r) => r.questionId))

    if (usedQuestionIds.size > 0) {
      await tx.climateSurveyQuestion.updateMany({
        where: { tenantId, climateSurveyConfigurationId: configId, id: { in: [...usedQuestionIds] } },
        data: { isActive: false },
      })
    }

    await tx.climateSurveyQuestion.deleteMany({
      where: { tenantId, climateSurveyConfigurationId: configId, id: { notIn: [...usedQuestionIds] } },
    })

    return tx.climateSurveyConfiguration.update({
      where: { id: configId },
      data: {
        name: input.name,
        description: input.description ?? null,
        frequency: input.frequency,
        scheduledDayOfMonth: input.scheduledDayOfMonth ?? null,
        dispatchTime: input.dispatchTime,
        respectEmployeeSchedule: input.respectEmployeeSchedule,
        tokenExpiryHours: input.tokenExpiryHours,
        sendViaMessaging: input.sendViaMessaging,
        sendViaSignedLink: input.sendViaSignedLink,
        workDays: {
          deleteMany: {},
          createMany: { data: input.workDays.map((d) => ({ dayOfWeek: d })) },
        },
        configDepartments: {
          deleteMany: {},
          createMany: { data: input.departmentIds.map((departmentId) => ({ departmentId })) },
        },
        questions: {
          create: input.questions.map((q) => ({ ...q, tenantId })),
        },
      },
      include: { questions: { where: { isActive: true }, orderBy: { order: "asc" } } },
    })
  })
}

export async function deactivateClimateSurveyConfigEntry(tenantId: string, configId: string): Promise<void> {
  const existing = await prisma.climateSurveyConfiguration.findFirst({ where: { id: configId, tenantId } })
  if (!existing) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")
  await prisma.climateSurveyConfiguration.update({
    where: { id: configId },
    data: { isActive: false },
  })
}

export interface ClimateSurveyCampaignSettingsInput {
  frequency: string
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  tokenExpiryHours: number
  departmentIds: string[]
}

export async function updateClimateSurveyConfigCampaignSettings(
  tenantId: string,
  configId: string,
  input: ClimateSurveyCampaignSettingsInput,
): Promise<void> {
  const existing = await prisma.climateSurveyConfiguration.findFirst({ where: { id: configId, tenantId } })
  if (!existing) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")

  await prisma.climateSurveyConfiguration.update({
    where: { id: configId },
    data: {
      frequency: input.frequency,
      sendViaMessaging: input.sendViaMessaging,
      sendViaSignedLink: input.sendViaSignedLink,
      tokenExpiryHours: input.tokenExpiryHours,
      scheduledDayOfMonth: null,
      configDepartments: {
        deleteMany: {},
        createMany: { data: input.departmentIds.map((departmentId) => ({ departmentId })) },
      },
    },
  })
}

export async function countActiveEmployeesGroupedByDepartment(
  tenantId: string,
  departmentIds: string[],
): Promise<Map<string, number>> {
  if (departmentIds.length === 0) return new Map()
  const rows = await prisma.employee.groupBy({
    by: ["departmentId"],
    where: {
      tenantId,
      departmentId: { in: departmentIds },
      status: "active",
      deletedAt: null,
    },
    _count: { _all: true },
  })
  return new Map(rows.map((row) => [row.departmentId, row._count._all]))
}

export function findClimateSurveyDispatchesByTenant(tenantId: string): Promise<ClimateSurveyDispatchWithConfig[]> {
  return prisma.climateSurveyDispatch.findMany({
    where: { tenantId },
    include: DISPATCH_WITH_CONFIG_INCLUDE,
    orderBy: { scheduledAt: "desc" },
    take: 300,
  })
}

export function findLatestActiveClimateSurveyDispatch(tenantId: string): Promise<ClimateSurveyDispatchWithConfig | null> {
  return prisma.climateSurveyDispatch.findFirst({
    where: { tenantId, status: "available" },
    include: DISPATCH_WITH_CONFIG_INCLUDE,
    orderBy: [{ dispatchedAt: "desc" }, { scheduledAt: "desc" }],
  })
}

export interface ClimateSurveyDispatchListingFilters {
  status?: string
  dateFrom?: Date
  dateTo?: Date
  configId?: string
}

function buildDispatchWhereInput(tenantId: string, filters: ClimateSurveyDispatchListingFilters): Prisma.ClimateSurveyDispatchWhereInput {
  const where: Prisma.ClimateSurveyDispatchWhereInput = { tenantId }
  if (filters.status !== undefined) where.status = filters.status
  if (filters.configId !== undefined) where.climateSurveyConfigurationId = filters.configId
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

export interface ClimateSurveyDispatchDayPageResult {
  dates: string[]
  total: number
}

export async function findClimateSurveyDispatchDaysPaginated(
  tenantId: string,
  filters: ClimateSurveyDispatchListingFilters,
  skip: number,
  take: number,
  timezone: string,
): Promise<ClimateSurveyDispatchDayPageResult> {
  const where = buildDispatchWhereInput(tenantId, filters)
  const allScheduledAts = await prisma.climateSurveyDispatch.findMany({
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

export function findClimateSurveyDispatchesForDates(
  tenantId: string,
  dates: string[],
  filters: ClimateSurveyDispatchListingFilters,
  timezone: string,
): Promise<ClimateSurveyDispatchWithConfig[]> {
  if (dates.length === 0) return Promise.resolve([])
  const where: Prisma.ClimateSurveyDispatchWhereInput = {
    tenantId,
    OR: dates.map((d) => ({
      scheduledAt: {
        gte: fromZonedTime(new Date(`${d}T00:00:00`), timezone),
        lte: fromZonedTime(new Date(`${d}T23:59:59`), timezone),
      },
    })),
  }
  if (filters.status !== undefined) where.status = filters.status
  return prisma.climateSurveyDispatch.findMany({
    where,
    include: DISPATCH_WITH_CONFIG_INCLUDE,
    orderBy: { scheduledAt: "desc" },
  })
}

export function findClimateSurveyDispatchesByTenantFiltered(
  tenantId: string,
  filters: ClimateSurveyDispatchListingFilters,
): Promise<ClimateSurveyDispatchWithConfig[]> {
  return prisma.climateSurveyDispatch.findMany({
    where: buildDispatchWhereInput(tenantId, filters),
    include: DISPATCH_WITH_CONFIG_INCLUDE,
    orderBy: { scheduledAt: "desc" },
  })
}

export async function findClimateSurveyDispatchesPaginated(
  tenantId: string,
  filters: ClimateSurveyDispatchListingFilters,
  skip: number,
  take: number,
): Promise<{ items: ClimateSurveyDispatchWithConfig[]; total: number }> {
  const where = buildDispatchWhereInput(tenantId, filters)
  const [items, total] = await prisma.$transaction([
    prisma.climateSurveyDispatch.findMany({
      where,
      include: DISPATCH_WITH_CONFIG_INCLUDE,
      orderBy: { scheduledAt: "desc" },
      skip,
      take,
    }),
    prisma.climateSurveyDispatch.count({ where }),
  ])
  return { items, total }
}

export interface ClimateSurveyDispatchResponseItem {
  questionId: string
  score: number
  departmentId: string | null
  responseId: string
}

export interface ClimateSurveyDispatchDashboardData {
  id: string
  tenantId: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  totalRecipients: number
  totalResponses: number
  configName: string
  frequency: string
  signedLinkToken: string | null
  departments: { id: string; name: string }[]
  deptRecipients: { departmentId: string; totalRecipients: number }[]
  questions: { id: string; text: string; order: number; scoreDirection: string; dimension: string }[]
  responseItems: ClimateSurveyDispatchResponseItem[]
}

interface QuestionSnapshot { id: string; text: string; order: number; scoreDirection: string; dimension: string }

function extractQuestionsFromResponses(
  responses: { items: { questionId: string; score: number; question: QuestionSnapshot }[] }[],
  fallbackQuestions: QuestionSnapshot[],
): QuestionSnapshot[] {
  const seen = new Map<string, QuestionSnapshot>()
  for (const response of responses) {
    for (const item of response.items) {
      if (!seen.has(item.questionId)) {
        seen.set(item.questionId, {
          id: item.question.id,
          text: item.question.text,
          order: item.question.order,
          scoreDirection: item.question.scoreDirection,
          dimension: item.question.dimension,
        })
      }
    }
  }
  if (seen.size === 0) return fallbackQuestions
  return Array.from(seen.values()).sort((a, b) => a.order - b.order)
}

export async function findClimateSurveyDispatchWithDashboard(tenantId: string, dispatchId: string): Promise<ClimateSurveyDispatchDashboardData | null> {
  const dispatch = await prisma.climateSurveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: {
      climateSurveyConfiguration: {
        include: {
          configDepartments: { include: { department: true } },
          questions: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
      deptDispatches: true,
      responses: {
        include: {
          items: { include: { question: true } },
        },
      },
    },
  })

  if (!dispatch) return null

  const totalRecipients = dispatch.deptDispatches.reduce((acc, dd) => acc + dd.totalRecipients, 0)
  const totalResponses = dispatch.deptDispatches.reduce((acc, dd) => acc + dd.totalResponses, 0)

  const configQuestions = dispatch.climateSurveyConfiguration.questions.map((q) => ({
    id: q.id,
    text: q.text,
    order: q.order,
    scoreDirection: q.scoreDirection,
    dimension: q.dimension,
  }))
  const questions = extractQuestionsFromResponses(dispatch.responses, configQuestions)

  const responseItems: ClimateSurveyDispatchResponseItem[] = dispatch.responses.flatMap((r) =>
    r.items.map((item) => ({ questionId: item.questionId, score: item.score, departmentId: r.departmentId, responseId: r.id })),
  )

  return {
    id: dispatch.id,
    tenantId: dispatch.tenantId,
    status: dispatch.status,
    scheduledAt: dispatch.scheduledAt,
    dispatchedAt: dispatch.dispatchedAt,
    totalRecipients,
    totalResponses,
    configName: dispatch.climateSurveyConfiguration.name,
    frequency: dispatch.climateSurveyConfiguration.frequency,
    signedLinkToken: dispatch.signedLinkToken ?? null,
    departments: dispatch.climateSurveyConfiguration.configDepartments.map((cd) => ({ id: cd.department.id, name: cd.department.name })),
    deptRecipients: dispatch.deptDispatches.map((dd) => ({ departmentId: dd.departmentId, totalRecipients: dd.totalRecipients })),
    questions,
    responseItems,
  }
}

export async function findClimateSurveyMultipleDispatchesWithDashboard(
  tenantId: string,
  dispatchIds: string[],
): Promise<ClimateSurveyDispatchDashboardData[]> {
  if (dispatchIds.length === 0) return []
  const dispatches = await prisma.climateSurveyDispatch.findMany({
    where: { id: { in: dispatchIds }, tenantId },
    include: {
      climateSurveyConfiguration: {
        include: {
          configDepartments: { include: { department: true } },
          questions: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
      deptDispatches: true,
      responses: { include: { items: { include: { question: true } } } },
    },
  })
  return dispatches.map((dispatch) => {
    const totalRecipients = dispatch.deptDispatches.reduce((acc, dd) => acc + dd.totalRecipients, 0)
    const totalResponses = dispatch.deptDispatches.reduce((acc, dd) => acc + dd.totalResponses, 0)
    const configQuestions = dispatch.climateSurveyConfiguration.questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      scoreDirection: q.scoreDirection,
      dimension: q.dimension,
    }))
    const questions = extractQuestionsFromResponses(dispatch.responses, configQuestions)
    return {
      id: dispatch.id,
      tenantId: dispatch.tenantId,
      status: dispatch.status,
      scheduledAt: dispatch.scheduledAt,
      dispatchedAt: dispatch.dispatchedAt,
      totalRecipients,
      totalResponses,
      configName: dispatch.climateSurveyConfiguration.name,
      frequency: dispatch.climateSurveyConfiguration.frequency,
      signedLinkToken: dispatch.signedLinkToken ?? null,
      departments: dispatch.climateSurveyConfiguration.configDepartments.map((cd) => ({ id: cd.department.id, name: cd.department.name })),
      deptRecipients: dispatch.deptDispatches.map((dd) => ({ departmentId: dd.departmentId, totalRecipients: dd.totalRecipients })),
      questions,
      responseItems: dispatch.responses.flatMap((r) =>
        r.items.map((item) => ({ questionId: item.questionId, score: item.score, departmentId: r.departmentId, responseId: r.id })),
      ),
    }
  })
}

export async function findRecentAvailableClimateSurveyDispatchesForOverview(
  tenantId: string,
  take: number,
): Promise<ClimateSurveyDispatchDashboardData[]> {
  const dispatches = await prisma.climateSurveyDispatch.findMany({
    where: { tenantId, status: "available" },
    orderBy: [{ dispatchedAt: "desc" }, { scheduledAt: "desc" }],
    take,
    select: { id: true },
  })
  const ids = dispatches.map((d) => d.id)
  const rows = await findClimateSurveyMultipleDispatchesWithDashboard(tenantId, ids)
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row !== undefined ? [row] : []
  })
}

export function findClimateSurveyDispatchById(tenantId: string, dispatchId: string): Promise<ClimateSurveyDispatchWithDetails | null> {
  return prisma.climateSurveyDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { climateSurveyConfiguration: { include: { questions: true } }, responses: true },
  })
}

export function findAllTenantsPendingClimateSurveyDispatches(): Promise<
  (ClimateSurveyDispatch & {
    climateSurveyConfiguration: ClimateSurveyConfiguration & {
      workDays: { dayOfWeek: number }[]
      questions: ClimateSurveyQuestion[]
      configDepartments: {
        department: Department & {
          workDays: { dayOfWeek: number }[]
          employees: (Employee & {
            workStartTime: string | null
            workEndTime: string | null
            workDays: { dayOfWeek: number }[]
          })[]
        }
      }[]
    }
    organization: { timezone: string; billingStatus: string; slug: string; name: string }
  })[]
> {
  return prisma.climateSurveyDispatch.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
      organization: { billingStatus: { in: ["active", "trialing"] } },
    },
    include: {
      climateSurveyConfiguration: {
        include: {
          workDays: true,
          questions: { orderBy: { order: "asc" } },
          configDepartments: {
            include: {
              department: {
                include: {
                  workDays: true,
                  employees: { where: { status: "active", deletedAt: null }, include: { workDays: true } },
                },
              },
            },
          },
        },
      },
      organization: { select: { timezone: true, billingStatus: true, slug: true, name: true } },
    },
  })
}

export function findClimateSurveyTokenByValue(token: string): Promise<ClimateSurveyTokenWithDispatch | null> {
  return prisma.climateSurveyResponseToken.findUnique({
    where: { token },
    include: {
      employee: true,
      dispatch: { include: { climateSurveyConfiguration: { include: { questions: { where: { isActive: true }, orderBy: { order: "asc" } }, organization: true } } } },
    },
  })
}

export function markClimateSurveyTokenUsed(tenantId: string, tokenId: string): Promise<ClimateSurveyResponseToken> {
  return prisma.climateSurveyResponseToken.update({
    where: { id: tokenId, tenantId },
    data: { usedAt: new Date() },
  })
}

export function createClimateSurveyDispatch(
  tenantId: string,
  configId: string,
  scheduledAt: Date,
  source: "auto" | "manual",
  signedLinkToken?: string,
): Promise<ClimateSurveyDispatch> {
  return prisma.climateSurveyDispatch.create({
    data: {
      tenantId,
      climateSurveyConfigurationId: configId,
      scheduledAt,
      status: "scheduled",
      source,
      ...(signedLinkToken !== undefined && { signedLinkToken }),
    },
  })
}

export function deleteAllTenantsExpiredClimateSurveyTokens(): Promise<{ count: number }> {
  return prisma.climateSurveyResponseToken.deleteMany({
    where: { expiresAt: { lt: new Date() }, usedAt: null },
  })
}

export function findClimateSurveyDispatchBySignedLinkToken(
  signedLinkToken: string,
): Promise<(ClimateSurveyDispatch & { climateSurveyConfiguration: ClimateSurveyConfiguration & { organization: Organization; configDepartments: { department: Department }[] } }) | null> {
  return prisma.climateSurveyDispatch.findUnique({
    where: { signedLinkToken },
    include: { climateSurveyConfiguration: { include: { organization: true, configDepartments: { include: { department: true } } } } },
  })
}

export function findEmployeeByPhoneOrDocument(
  tenantId: string,
  identifier: string,
): Promise<Employee | null> {
  const trimmed = identifier.trim()
  const normalizedPhone = normalizePhoneToE164(trimmed)
  const phoneConditions: Prisma.EmployeeWhereInput[] = normalizedPhone
    ? [{ phone: normalizedPhone }, { phone: trimmed }]
    : [{ phone: trimmed }]
  return prisma.employee.findFirst({
    where: {
      tenantId,
      status: "active",
      deletedAt: null,
      OR: [...phoneConditions, { document: trimmed }],
    },
    orderBy: { createdAt: "asc" },
  })
}

export interface ExistingDispatchToken {
  employeeId: string
  token: string
  shortCode: string | null
  usedAt: Date | null
  expiresAt: Date
}

export function findExistingTokensForDispatch(
  tenantId: string,
  dispatchId: string,
  employeeIds: string[],
): Promise<ExistingDispatchToken[]> {
  if (employeeIds.length === 0) return Promise.resolve([])
  return prisma.climateSurveyResponseToken.findMany({
    where: { tenantId, dispatchId, employeeId: { in: employeeIds } },
    select: { employeeId: true, token: true, shortCode: true, usedAt: true, expiresAt: true },
  })
}

export function findClimateSurveyTokenByShortCode(
  orgSlug: string,
  shortCode: string,
): Promise<{ token: string } | null> {
  return prisma.climateSurveyResponseToken.findFirst({
    where: {
      shortCode,
      dispatch: { organization: { slug: orgSlug } },
    },
    select: { token: true },
  })
}

export function findUnusedClimateSurveyTokenForEmployee(
  tenantId: string,
  dispatchId: string,
  employeeId: string,
): Promise<ClimateSurveyResponseToken | null> {
  return prisma.climateSurveyResponseToken.findFirst({
    where: { tenantId, dispatchId, employeeId, usedAt: null, expiresAt: { gt: new Date() } },
  })
}

export function findUsedClimateSurveyTokenForEmployee(
  tenantId: string,
  dispatchId: string,
  employeeId: string,
): Promise<ClimateSurveyResponseToken | null> {
  return prisma.climateSurveyResponseToken.findFirst({
    where: { tenantId, dispatchId, employeeId, usedAt: { not: null } },
  })
}

export async function createClimateSurveyResponseWithItems(data: CreateClimateSurveyResponseInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.climateSurveyResponseToken.updateMany({
      where: { id: data.tokenId, tenantId: data.tenantId, usedAt: null },
      data: { usedAt: new Date() },
    })

    if (claimed.count === 0) {
      throw new AppError("SURVEY_ALREADY_ANSWERED", "Esta pesquisa já foi respondida.")
    }

    await tx.climateSurveyResponse.create({
      data: {
        tenantId: data.tenantId,
        dispatchId: data.dispatchId,
        createdAt: toAnonymousSurveyResponseDate(),
        ...(data.departmentId !== null ? { departmentId: data.departmentId } : {}),
        ...(data.openComment !== undefined ? { openComment: data.openComment } : {}),
        items: {
          create: data.answers.map((a) => ({
            questionId: a.questionId,
            score: a.score,
          })),
        },
      },
    })

    if (data.departmentId !== null) {
      await tx.climateSurveyDeptDispatch.updateMany({
        where: { dispatchId: data.dispatchId, departmentId: data.departmentId },
        data: { totalResponses: { increment: 1 } },
      })
    }
  })
}

export async function createClimateSurveyTokens(tokens: CreateClimateSurveyTokenInput[]): Promise<void> {
  if (tokens.length === 0) return
  const tokenRows = tokens.map(({ workDays: _wd, ...rest }) => rest)
  const workDayRows = tokens.flatMap((t) =>
    (t.workDays ?? []).map((day) => ({ tokenId: t.id, dayOfWeek: day })),
  )
  await prisma.$transaction([
    prisma.climateSurveyResponseToken.createMany({ data: tokenRows }),
    ...(workDayRows.length > 0
      ? [prisma.climateSurveyResponseTokenWorkDay.createMany({ data: workDayRows })]
      : []),
  ])
}

export async function refreshClimateSurveyTokenWorkHours(
  tokenId: string,
  workStartTime: string,
  workEndTime: string,
): Promise<void> {
  await prisma.climateSurveyResponseToken.update({
    where: { id: tokenId },
    data: { workStartTime, workEndTime },
  })
}

export async function markClimateSurveyDispatchDispatched(tenantId: string, dispatchId: string): Promise<void> {
  await prisma.climateSurveyDispatch.updateMany({
    where: { id: dispatchId, tenantId, dispatchedAt: null },
    data: { status: "available", dispatchedAt: new Date() },
  })
}

export async function upsertClimateSurveyDeptDispatch(
  dispatchId: string,
  departmentId: string,
  totalRecipients: number,
): Promise<void> {
  await prisma.climateSurveyDeptDispatch.upsert({
    where: { dispatchId_departmentId: { dispatchId, departmentId } },
    create: { dispatchId, departmentId, totalRecipients, totalResponses: 0 },
    update: { totalRecipients },
  })
}

export interface ClimateSurveyDispatchEmployee {
  id: string
  name: string
  phone: string
  email: string | null
  workStartTime: string | null
  workEndTime: string | null
  workDays: number[]
}

export interface ClimateSurveyDispatchDepartment {
  id: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
  employees: ClimateSurveyDispatchEmployee[]
}

export interface ActiveClimateSurveyConfigForDispatch {
  id: string
  tenantId: string
  frequency: string
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  respectEmployeeSchedule: boolean
  tokenExpiryHours: number
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  organization: { timezone: string; slug: string; name: string }
  departments: ClimateSurveyDispatchDepartment[]
  questions: ClimateSurveyQuestion[]
  lastDispatchedAt: Date | null
}

const ACTIVE_BILLING_STATUSES_FOR_DISPATCH = new Set(["active", "trialing"])

export async function findAllTenantsActiveClimateSurveyConfigsForAutoDispatch(): Promise<ActiveClimateSurveyConfigForDispatch[]> {
  const configs = await prisma.climateSurveyConfiguration.findMany({
    where: { isActive: true },
    include: {
      organization: { select: { timezone: true, billingStatus: true, slug: true, name: true } },
      questions: { orderBy: { order: "asc" } },
      workDays: true,
      configDepartments: {
        include: {
          department: {
            include: {
              workDays: true,
              employees: { where: { status: "active", deletedAt: null }, include: { workDays: true } },
            },
          },
        },
      },
      dispatches: {
        where: { status: "available", source: "auto" },
        orderBy: { dispatchedAt: "desc" },
        take: 1,
        select: { dispatchedAt: true },
      },
    },
  })
  return configs
    .filter((c) => {
      const hasEmployees = c.configDepartments.some((cd) => cd.department.employees.length > 0)
      return hasEmployees && ACTIVE_BILLING_STATUSES_FOR_DISPATCH.has(c.organization.billingStatus)
    })
    .map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      frequency: c.frequency,
      scheduledDayOfMonth: c.scheduledDayOfMonth,
      dispatchTime: c.dispatchTime,
      workDays: c.workDays.map((w) => w.dayOfWeek),
      organization: { timezone: c.organization.timezone, slug: c.organization.slug, name: c.organization.name },
      departments: c.configDepartments.map((cd) => ({
        id: cd.department.id,
        workStartTime: cd.department.workStartTime,
        workEndTime: cd.department.workEndTime,
        workDays: cd.department.workDays.map((w) => w.dayOfWeek),
        employees: cd.department.employees.map((emp) => ({
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          email: emp.email,
          workStartTime: emp.workStartTime,
          workEndTime: emp.workEndTime,
          workDays: emp.workDays.map((w) => w.dayOfWeek),
        })),
      })),
      questions: c.questions,
      respectEmployeeSchedule: c.respectEmployeeSchedule,
      tokenExpiryHours: c.tokenExpiryHours,
      sendViaMessaging: c.sendViaMessaging,
      sendViaSignedLink: c.sendViaSignedLink,
      lastDispatchedAt: c.dispatches[0]?.dispatchedAt ?? null,
    }))
}

export interface PendingClimateSurveyAdherenceDispatch {
  id: string
  tenantId: string
  deptDispatches: { departmentId: string; totalRecipients: number }[]
}

export function findAllTenantsClimateSurveyDispatches48hAgo(): Promise<PendingClimateSurveyAdherenceDispatch[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  return prisma.climateSurveyDispatch.findMany({
    where: {
      status: "available",
      dispatchedAt: { lte: cutoff },
      adherenceCheckedAt: null,
      organization: { billingStatus: { in: ["active", "trialing"] } },
    },
    include: { deptDispatches: { select: { departmentId: true, totalRecipients: true } } },
  })
}

export function countClimateSurveyResponsesForDispatch(tenantId: string, dispatchId: string): Promise<number> {
  return prisma.climateSurveyResponse.count({ where: { dispatchId, tenantId } })
}

export function countClimateSurveyResponsesByDispatchAndDept(dispatchId: string, departmentId: string): Promise<number> {
  return prisma.climateSurveyResponse.count({ where: { dispatchId, departmentId } })
}

export interface ClimateSurveyOpenCommentRow {
  id: string
  openComment: string
  createdAt: Date
}

export async function findClimateSurveyOpenCommentsByDispatchIds(
  tenantId: string,
  dispatchIds: string[],
): Promise<ClimateSurveyOpenCommentRow[]> {
  if (dispatchIds.length === 0) return []
  const rows = await prisma.climateSurveyResponse.findMany({
    where: { tenantId, dispatchId: { in: dispatchIds }, openComment: { not: null } },
    select: { id: true, openComment: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.flatMap((row) =>
    row.openComment === null ? [] : [{ id: row.id, openComment: row.openComment, createdAt: row.createdAt }],
  )
}

export async function createClimateSurveyAdherenceAlert(data: CreateClimateSurveyAdherenceAlertInput): Promise<void> {
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

export async function markClimateSurveyDispatchAdherenceChecked(tenantId: string, dispatchId: string): Promise<void> {
  await prisma.climateSurveyDispatch.updateMany({
    where: { id: dispatchId, tenantId },
    data: { adherenceCheckedAt: new Date() },
  })
}

export interface ReminderEligibleToken {
  id: string
  tenantId: string
  employeeId: string
  dispatchId: string
  expiresAt: Date
  shortCode: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
  tokenExpiryHours: number
  respectEmployeeSchedule: boolean
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  orgTimezone: string
  orgSlug: string
  orgName: string
  employeeName: string
  employeePhone: string
  employeeEmail: string | null
}

export async function findAllTenantsTokensEligibleForReminderCheck(): Promise<ReminderEligibleToken[]> {
  const now = new Date()
  const rows = await prisma.climateSurveyResponseToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: now },
      reminderSentAt: null,
      shortCode: { not: null },
      dispatch: {
        status: "available",
        organization: { billingStatus: { in: ["active", "trialing"] } },
      },
    },
    select: {
      id: true,
      tenantId: true,
      employeeId: true,
      dispatchId: true,
      expiresAt: true,
      shortCode: true,
      workStartTime: true,
      workEndTime: true,
      workDays: { select: { dayOfWeek: true } },
      dispatch: {
        select: {
          climateSurveyConfiguration: {
            select: {
              tokenExpiryHours: true,
              respectEmployeeSchedule: true,
              sendViaMessaging: true,
              sendViaSignedLink: true,
            },
          },
          organization: { select: { timezone: true, slug: true, name: true } },
        },
      },
      employee: { select: { name: true, phone: true, email: true } },
    },
  })
  return rows
    .filter(
      (r): r is typeof r & { shortCode: string } => r.shortCode !== null,
    )
    .map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      dispatchId: r.dispatchId,
      expiresAt: r.expiresAt,
      shortCode: r.shortCode,
      workStartTime: r.workStartTime,
      workEndTime: r.workEndTime,
      workDays: r.workDays.map((w) => w.dayOfWeek),
      tokenExpiryHours: r.dispatch.climateSurveyConfiguration.tokenExpiryHours,
      respectEmployeeSchedule: r.dispatch.climateSurveyConfiguration.respectEmployeeSchedule,
      sendViaMessaging: r.dispatch.climateSurveyConfiguration.sendViaMessaging,
      sendViaSignedLink: r.dispatch.climateSurveyConfiguration.sendViaSignedLink,
      orgTimezone: r.dispatch.organization.timezone,
      orgSlug: r.dispatch.organization.slug,
      orgName: r.dispatch.organization.name,
      employeeName: r.employee.name,
      employeePhone: r.employee.phone,
      employeeEmail: r.employee.email,
    }))
}

export async function markClimateSurveyTokensReminderSent(tokenIds: string[]): Promise<void> {
  if (tokenIds.length === 0) return
  await prisma.climateSurveyResponseToken.updateMany({
    where: { id: { in: tokenIds } },
    data: { reminderSentAt: new Date() },
  })
}

export interface ClimateSurveyAdherenceDispatchRow {
  id: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  configName: string
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  departments: { id: string; name: string }[]
  deptDispatches: { departmentId: string; totalRecipients: number; totalResponses: number }[]
}

export async function findClimateSurveyAdherenceDispatch(
  tenantId: string,
  dispatchId?: string,
): Promise<ClimateSurveyAdherenceDispatchRow | null> {
  const dispatch = dispatchId !== undefined
    ? await prisma.climateSurveyDispatch.findFirst({
        where: { id: dispatchId, tenantId },
        include: {
          climateSurveyConfiguration: {
            include: { configDepartments: { include: { department: true } } },
          },
          deptDispatches: { select: { departmentId: true, totalRecipients: true, totalResponses: true } },
        },
      })
    : await prisma.climateSurveyDispatch.findFirst({
        where: { tenantId, status: "available" },
        orderBy: [{ dispatchedAt: "desc" }, { scheduledAt: "desc" }],
        include: {
          climateSurveyConfiguration: {
            include: { configDepartments: { include: { department: true } } },
          },
          deptDispatches: { select: { departmentId: true, totalRecipients: true, totalResponses: true } },
        },
      })

  if (dispatch === null) return null

  return {
    id: dispatch.id,
    status: dispatch.status,
    scheduledAt: dispatch.scheduledAt,
    dispatchedAt: dispatch.dispatchedAt,
    configName: dispatch.climateSurveyConfiguration.name,
    sendViaMessaging: dispatch.climateSurveyConfiguration.sendViaMessaging,
    sendViaSignedLink: dispatch.climateSurveyConfiguration.sendViaSignedLink,
    departments: dispatch.climateSurveyConfiguration.configDepartments.map((cd) => ({
      id: cd.department.id,
      name: cd.department.name,
    })),
    deptDispatches: dispatch.deptDispatches,
  }
}

export interface ClimateSurveyTokenChannelStatRow {
  shortCode: string | null
  usedAt: Date | null
  departmentId: string
}

export async function findClimateSurveyTokenChannelStats(
  tenantId: string,
  dispatchId: string,
): Promise<ClimateSurveyTokenChannelStatRow[]> {
  const rows = await prisma.climateSurveyResponseToken.findMany({
    where: { tenantId, dispatchId },
    select: {
      shortCode: true,
      usedAt: true,
      employee: { select: { departmentId: true } },
    },
  })
  return rows.map((row) => ({
    shortCode: row.shortCode,
    usedAt: row.usedAt,
    departmentId: row.employee.departmentId,
  }))
}

export async function findClimateSurveyTokensEligibleForManualReminder(
  tenantId: string,
  dispatchId: string,
): Promise<ReminderEligibleToken[]> {
  const now = new Date()
  const rows = await prisma.climateSurveyResponseToken.findMany({
    where: {
      tenantId,
      dispatchId,
      usedAt: null,
      expiresAt: { gt: now },
      shortCode: { not: null },
      dispatch: { status: "available" },
    },
    select: {
      id: true,
      tenantId: true,
      employeeId: true,
      dispatchId: true,
      expiresAt: true,
      shortCode: true,
      workStartTime: true,
      workEndTime: true,
      workDays: { select: { dayOfWeek: true } },
      dispatch: {
        select: {
          climateSurveyConfiguration: {
            select: {
              tokenExpiryHours: true,
              respectEmployeeSchedule: true,
              sendViaMessaging: true,
              sendViaSignedLink: true,
            },
          },
          organization: { select: { timezone: true, slug: true, name: true } },
        },
      },
      employee: { select: { name: true, phone: true, email: true } },
    },
  })
  return rows
    .filter((r): r is typeof r & { shortCode: string } => r.shortCode !== null)
    .map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      dispatchId: r.dispatchId,
      expiresAt: r.expiresAt,
      shortCode: r.shortCode,
      workStartTime: r.workStartTime,
      workEndTime: r.workEndTime,
      workDays: r.workDays.map((w) => w.dayOfWeek),
      tokenExpiryHours: r.dispatch.climateSurveyConfiguration.tokenExpiryHours,
      respectEmployeeSchedule: r.dispatch.climateSurveyConfiguration.respectEmployeeSchedule,
      sendViaMessaging: r.dispatch.climateSurveyConfiguration.sendViaMessaging,
      sendViaSignedLink: r.dispatch.climateSurveyConfiguration.sendViaSignedLink,
      orgTimezone: r.dispatch.organization.timezone,
      orgSlug: r.dispatch.organization.slug,
      orgName: r.dispatch.organization.name,
      employeeName: r.employee.name,
      employeePhone: r.employee.phone,
      employeeEmail: r.employee.email,
    }))
}
