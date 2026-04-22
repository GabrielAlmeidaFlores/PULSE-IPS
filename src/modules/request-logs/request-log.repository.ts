import { prisma } from "@/libs/db"
import type { Prisma } from "@prisma/client"
import type { InsertRequestLogInput, RequestLogFilters, RequestLogPage, RequestLogRow } from "@/modules/request-logs/request-log.types"

const PAGE_SIZE_DEFAULT = 50

function buildStatusFilter(statusGroup: string): { gte: number; lte: number } {
  const map: Record<string, { gte: number; lte: number }> = {
    "2xx": { gte: 200, lte: 299 },
    "3xx": { gte: 300, lte: 399 },
    "4xx": { gte: 400, lte: 499 },
    "5xx": { gte: 500, lte: 599 },
  }
  return map[statusGroup] ?? { gte: 100, lte: 599 }
}

export const requestLogRepository = {
  insert: async (data: InsertRequestLogInput): Promise<void> => {
    await prisma.requestLog.create({
      data: {
        method: data.method,
        path: data.path,
        query: data.query ?? null,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        requestHeaders: data.requestHeaders as Prisma.InputJsonValue,
        ...(data.requestBody !== undefined ? { requestBody: data.requestBody as Prisma.InputJsonValue } : {}),
        responseStatus: data.responseStatus ?? null,
        ...(data.responseHeaders !== undefined ? { responseHeaders: data.responseHeaders as Prisma.InputJsonValue } : {}),
        ...(data.responseBody !== undefined ? { responseBody: data.responseBody as Prisma.InputJsonValue } : {}),
        durationMs: data.durationMs ?? null,
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? null,
        userType: data.userType ?? null,
        isRedirect: data.isRedirect ?? false,
        redirectTo: data.redirectTo ?? null,
        errorMessage: data.errorMessage ?? null,
        errorStack: data.errorStack ?? null,
      },
    })
  },

  findMany: async (filters: RequestLogFilters): Promise<RequestLogPage> => {
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? PAGE_SIZE_DEFAULT
    const skip = (page - 1) * pageSize

    const where = {
      ...(filters.method !== undefined && filters.method !== "all" ? { method: filters.method } : {}),
      ...(filters.pathContains !== undefined && filters.pathContains.length > 0
        ? { path: { contains: filters.pathContains, mode: "insensitive" as const } }
        : {}),
      ...(filters.statusGroup !== undefined && filters.statusGroup.length > 0
        ? { responseStatus: buildStatusFilter(filters.statusGroup) }
        : {}),
      ...(filters.userType !== undefined && filters.userType !== "all" ? { userType: filters.userType } : {}),
      ...(filters.dateFrom !== undefined || filters.dateTo !== undefined
        ? {
            createdAt: {
              ...(filters.dateFrom !== undefined ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo !== undefined ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.requestLog.count({ where }),
    ])

    return {
      rows: rows as RequestLogRow[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },
}
