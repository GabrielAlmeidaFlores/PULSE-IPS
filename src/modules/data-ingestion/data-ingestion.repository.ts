import type {
  EmployeeMonthly as PrismaEmployeeMonthly,
  DataImportBatch as PrismaDataImportBatch,
} from "@prisma/client"
import { prisma } from "@/libs/db"
import type {
  CreateDataImportBatchInput,
  EmployeeMonthlyRow,
  DataImportBatch,
  DataImportBatchStatus,
  EmployeeMonthlyQualityStatus,
} from "@/modules/data-ingestion/data-ingestion.types"

const DATA_IMPORT_BATCH_STATUSES: DataImportBatchStatus[] = [
  "received",
  "processing",
  "extracted",
  "validated",
  "failed",
]

const EMPLOYEE_MONTHLY_QUALITY_STATUSES: EmployeeMonthlyQualityStatus[] = ["pending", "validated", "corrected", "error"]

function toDataImportBatchStatus(value: string): DataImportBatchStatus {
  return DATA_IMPORT_BATCH_STATUSES.find((status) => status === value) ?? "received"
}

function toEmployeeMonthlyQualityStatus(value: string): EmployeeMonthlyQualityStatus {
  return EMPLOYEE_MONTHLY_QUALITY_STATUSES.find((status) => status === value) ?? "pending"
}

function mapDataImportBatch(batch: PrismaDataImportBatch): DataImportBatch {
  return {
    id: batch.id,
    tenantId: batch.tenantId,
    fileName: batch.fileName,
    fileUrl: batch.fileUrl,
    fileType: batch.fileType,
    competencia: batch.competencia,
    status: toDataImportBatchStatus(batch.status),
    aiProvider: batch.aiProvider,
    totalRecords: batch.totalRecords,
    correctedRecords: batch.correctedRecords,
    errorRecords: batch.errorRecords,
    errorMessage: batch.errorMessage,
    createdById: batch.createdById,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  }
}

function mapEmployeeMonthlyRow(row: PrismaEmployeeMonthly): EmployeeMonthlyRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    batchId: row.batchId,
    competencia: row.competencia,
    employeeName: row.employeeName,
    document: row.document,
    registration: row.registration,
    departmentName: row.departmentName,
    roleName: row.roleName,
    admissionDate: row.admissionDate,
    terminationDate: row.terminationDate,
    expectedHours: row.expectedHours,
    workedHours: row.workedHours,
    justifiedAbsenceHours: row.justifiedAbsenceHours,
    unjustifiedAbsenceHours: row.unjustifiedAbsenceHours,
    absenceRatePercent: row.absenceRatePercent,
    terminationType: row.terminationType,
    qualityStatus: toEmployeeMonthlyQualityStatus(row.qualityStatus),
    validationNotes: row.validationNotes,
    rowHash: row.rowHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export interface CreateEmployeeMonthlyRowInput {
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
  rowHash: string
}

export interface UpdateDataImportBatchPatch {
  status?: DataImportBatchStatus
  totalRecords?: number
  correctedRecords?: number
  errorRecords?: number
  errorMessage?: string | null
}

export interface UpdateEmployeeMonthlyRowPatch {
  employeeName?: string
  document?: string | null
  registration?: string | null
  departmentName?: string | null
  roleName?: string | null
  admissionDate?: Date | null
  terminationDate?: Date | null
  expectedHours?: number | null
  workedHours?: number | null
  justifiedAbsenceHours?: number | null
  unjustifiedAbsenceHours?: number | null
  absenceRatePercent?: number | null
  terminationType?: string | null
  qualityStatus?: EmployeeMonthlyQualityStatus
  validationNotes?: string | null
}

export async function createDataImportBatch(
  tenantId: string,
  input: CreateDataImportBatchInput,
): Promise<DataImportBatch> {
  const batch = await prisma.dataImportBatch.create({
    data: {
      tenantId,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileType: input.fileType,
      competencia: input.competencia,
      aiProvider: input.aiProvider,
      ...(input.createdById !== undefined ? { createdById: input.createdById } : {}),
    },
  })
  return mapDataImportBatch(batch)
}

export async function findDataImportBatchById(
  tenantId: string,
  id: string,
): Promise<DataImportBatch | null> {
  const batch = await prisma.dataImportBatch.findFirst({ where: { id, tenantId } })
  return batch !== null ? mapDataImportBatch(batch) : null
}

export async function updateDataImportBatch(
  tenantId: string,
  id: string,
  patch: UpdateDataImportBatchPatch,
): Promise<void> {
  await prisma.dataImportBatch.updateMany({ where: { id, tenantId }, data: patch })
}

export async function createEmployeeMonthlyRows(
  rows: CreateEmployeeMonthlyRowInput[],
): Promise<number> {
  if (rows.length === 0) return 0
  const result = await prisma.employeeMonthly.createMany({ data: rows, skipDuplicates: true })
  return result.count
}

export async function findEmployeeMonthlyRowsByBatch(
  tenantId: string,
  batchId: string,
): Promise<EmployeeMonthlyRow[]> {
  const rows = await prisma.employeeMonthly.findMany({
    where: { tenantId, batchId },
    orderBy: { employeeName: "asc" },
  })
  return rows.map(mapEmployeeMonthlyRow)
}

export async function findEmployeeMonthlyRowByHash(
  tenantId: string,
  batchId: string,
  rowHash: string,
): Promise<EmployeeMonthlyRow | null> {
  const row = await prisma.employeeMonthly.findFirst({ where: { tenantId, batchId, rowHash } })
  return row !== null ? mapEmployeeMonthlyRow(row) : null
}

export async function updateEmployeeMonthlyRowById(
  tenantId: string,
  id: string,
  patch: UpdateEmployeeMonthlyRowPatch,
): Promise<void> {
  await prisma.employeeMonthly.updateMany({ where: { id, tenantId }, data: patch })
}

export async function markEmployeeMonthlyRowsValidated(
  tenantId: string,
  batchId: string,
): Promise<number> {
  const result = await prisma.employeeMonthly.updateMany({
    where: { tenantId, batchId, qualityStatus: "pending" },
    data: { qualityStatus: "validated" },
  })
  return result.count
}
