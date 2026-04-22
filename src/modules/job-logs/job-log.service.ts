import { jobLogRepository } from "@/modules/job-logs/job-log.repository"
import type { InsertJobLogInput, JobLogFilters, JobLogPage } from "@/modules/job-logs/job-log.types"

function insertJobLog(input: InsertJobLogInput): Promise<void> {
  return jobLogRepository.insertLog(input)
}

function getJobLogs(filters: JobLogFilters): Promise<JobLogPage> {
  return jobLogRepository.listLogs(filters)
}

export const jobLogService = { insertJobLog, getJobLogs }
