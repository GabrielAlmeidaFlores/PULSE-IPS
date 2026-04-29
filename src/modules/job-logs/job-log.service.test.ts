import { describe, it, expect, vi, beforeEach } from "vitest"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import { jobLogRepository } from "@/modules/job-logs/job-log.repository"
import type { InsertJobLogInput, JobLogFilters, JobLogPage } from "@/modules/job-logs/job-log.types"

vi.mock("@/modules/job-logs/job-log.repository")

const mockInsertLog = vi.mocked(jobLogRepository.insertLog)
const mockListLogs = vi.mocked(jobLogRepository.listLogs)

const JOB_LOG_INPUT: InsertJobLogInput = {
  queueName: "jobs",
  jobName: "survey-dispatcher",
  jobId: "job-1",
  status: "completed",
  durationMs: 150,
  payload: null,
  result: null,
  attemptNumber: 1,
  maxAttempts: 3,
  startedAt: new Date("2026-01-01T10:00:00Z"),
  finishedAt: new Date("2026-01-01T10:00:00.150Z"),
}

const JOB_LOG_PAGE: JobLogPage = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsertLog.mockResolvedValue(undefined)
  mockListLogs.mockResolvedValue(JOB_LOG_PAGE)
})

describe("jobLogService.insertJobLog", () => {
  it("delega inserção ao repository", async () => {
    await jobLogService.insertJobLog(JOB_LOG_INPUT)

    expect(mockInsertLog).toHaveBeenCalledWith(JOB_LOG_INPUT)
  })
})

describe("jobLogService.getJobLogs", () => {
  it("retorna página de logs do repository", async () => {
    const filters: JobLogFilters = { page: 1, pageSize: 10 }

    const result = await jobLogService.getJobLogs(filters)

    expect(mockListLogs).toHaveBeenCalledWith(filters)
    expect(result).toEqual(JOB_LOG_PAGE)
  })
})
