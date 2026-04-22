import { requestLogRepository } from "@/modules/request-logs/request-log.repository"
import type { InsertRequestLogInput, RequestLogFilters, RequestLogPage } from "@/modules/request-logs/request-log.types"

export const requestLogService = {
  insertLog: (data: InsertRequestLogInput): Promise<void> => {
    return requestLogRepository.insert(data)
  },

  getLogs: (filters: RequestLogFilters): Promise<RequestLogPage> => {
    return requestLogRepository.findMany(filters)
  },
}
