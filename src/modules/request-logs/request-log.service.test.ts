import { describe, it, expect, vi, beforeEach } from "vitest"
import { requestLogService } from "@/modules/request-logs/request-log.service"
import { requestLogRepository } from "@/modules/request-logs/request-log.repository"
import type { InsertRequestLogInput, RequestLogFilters, RequestLogPage } from "@/modules/request-logs/request-log.types"

vi.mock("@/modules/request-logs/request-log.repository")

const mockInsert = vi.mocked(requestLogRepository.insert)
const mockFindMany = vi.mocked(requestLogRepository.findMany)

const LOG_INPUT: InsertRequestLogInput = {
  method: "GET",
  path: "/dashboard",
  requestHeaders: {},
}

const LOG_PAGE: RequestLogPage = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockResolvedValue(undefined)
  mockFindMany.mockResolvedValue(LOG_PAGE)
})

describe("requestLogService.insertLog", () => {
  it("delega inserção ao repository", async () => {
    await requestLogService.insertLog(LOG_INPUT)

    expect(mockInsert).toHaveBeenCalledWith(LOG_INPUT)
  })
})

describe("requestLogService.getLogs", () => {
  it("retorna página de logs do repository", async () => {
    const filters: RequestLogFilters = { page: 1, pageSize: 10 }

    const result = await requestLogService.getLogs(filters)

    expect(mockFindMany).toHaveBeenCalledWith(filters)
    expect(result).toEqual(LOG_PAGE)
  })
})
