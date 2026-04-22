import { prisma } from "@/libs/db"
import type { InsertJobLogInput, JobLogFilters, JobLogPage, JobLogRow } from "@/modules/job-logs/job-log.types"

const MAX_PAYLOAD_SIZE = 10_000

function truncatePayload(value: unknown): unknown {
  const serialized = JSON.stringify(value)
  if (serialized === undefined || serialized.length <= MAX_PAYLOAD_SIZE) return value
  return { _truncated: true, preview: serialized.slice(0, MAX_PAYLOAD_SIZE) }
}

async function insertLog(input: InsertJobLogInput): Promise<void> {
  await prisma.jobLog.create({
    data: {
      jobId: input.jobId,
      jobName: input.jobName,
      queueName: input.queueName,
      status: input.status,
      attemptNumber: input.attemptNumber,
      maxAttempts: input.maxAttempts,
      payload: truncatePayload(input.payload) as never,
      ...(input.result !== undefined ? { result: truncatePayload(input.result) as never } : {}),
      errorMessage: input.errorMessage ?? null,
      errorStack: input.errorStack ?? null,
      queuedAt: input.queuedAt ?? null,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
      durationMs: input.durationMs ?? null,
    },
  })
}

async function listLogs(filters: JobLogFilters): Promise<JobLogPage> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 10
  const skip = (page - 1) * pageSize

  const where = {
    ...(filters.jobName !== undefined ? { jobName: filters.jobName } : {}),
    ...(filters.queueName !== undefined ? { queueName: filters.queueName } : {}),
    ...(filters.status !== undefined ? { status: filters.status } : {}),
    ...((filters.dateFrom !== undefined || filters.dateTo !== undefined)
      ? {
          createdAt: {
            ...(filters.dateFrom !== undefined ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo !== undefined ? { lte: filters.dateTo } : {}),
          },
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.jobLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.jobLog.count({ where }),
  ])

  return {
    rows: rows as JobLogRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const jobLogRepository = { insertLog, listLogs }
