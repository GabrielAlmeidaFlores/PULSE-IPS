export type DataImportBatchStatus = "received" | "processing" | "extracted" | "validated" | "failed"

export type EmployeeMonthlyQualityStatus = "pending" | "validated" | "corrected" | "error"

export interface DataImportBatch {
  id: string
  tenantId: string
  fileName: string
  fileUrl: string
  fileType: string
  competencia: string
  status: DataImportBatchStatus
  aiProvider: string
  totalRecords: number
  correctedRecords: number
  errorRecords: number
  errorMessage: string | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EmployeeMonthlyRow {
  id: string
  tenantId: string
  batchId: string
  competencia: string
  employeeName: string
  document: string | null
  registration: string | null
  departmentName: string | null
  roleName: string | null
  admissionDate: Date | null
  terminationDate: Date | null
  expectedHours: number | null
  workedHours: number | null
  justifiedAbsenceHours: number | null
  unjustifiedAbsenceHours: number | null
  absenceRatePercent: number | null
  terminationType: string | null
  qualityStatus: EmployeeMonthlyQualityStatus
  validationNotes: string | null
  rowHash: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateDataImportBatchInput {
  fileName: string
  fileUrl: string
  fileType: string
  competencia: string
  aiProvider: string
  createdById?: string
}

export interface DataExtractionSummary {
  batchId: string
  status: DataImportBatchStatus
  totalRecords: number
  correctedRecords: number
  errorRecords: number
}

export interface DataIngestionContext {
  tenantId: string
  batchId: string
  competencia: string
}
