import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  enqueueDataIngestionBatch,
  getDataIngestionBatchFile,
  listDataIngestionBatchesPaginated,
  processDataExtractionWithAI,
  processPendingDataIngestionBatches,
  runDataIngestionWithAI,
  validateDataExtractionWithAI,
} from "@/modules/data-ingestion/data-ingestion.service"
import {
  createDataImportBatch,
  createEmployeeMonthlyRows,
  findAllTenantsReceivedDataImportBatches,
  findDataImportBatchesByTenantPaginated,
  findEmployeeMonthlyRowByHash,
  findEmployeeMonthlyRowsByBatch,
  findDataImportBatchById,
  markEmployeeMonthlyRowsValidated,
  updateEmployeeMonthlyRowById,
  updateDataImportBatch,
} from "@/modules/data-ingestion/data-ingestion.repository"
import type { IAIService } from "@/libs/integrations/ai/ai.interface"
import type { IStorageService } from "@/libs/integrations/storage/storage.interface"

vi.mock("@/modules/data-ingestion/data-ingestion.repository")
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  }),
}))

const mockGenerate = vi.fn()
const MOCK_AI_SERVICE = { generate: mockGenerate } as IAIService

const mockDownload = vi.fn()
const MOCK_STORAGE_SERVICE = {
  upload: vi.fn(),
  download: mockDownload,
  delete: vi.fn(),
  getUrl: vi.fn(),
} as IStorageService

vi.mock("@/libs/integrations", () => ({
  getAIService: () => MOCK_AI_SERVICE,
  getStorageService: () => MOCK_STORAGE_SERVICE,
}))

const mockJobAdd = vi.fn()
vi.mock("@/libs/queue", () => ({
  getJobQueue: () => ({ add: mockJobAdd }),
}))

const TENANT_ID = "tenant-1"
const BATCH_ID = "batch-1"
const COMPETENCIA = "2026-08"
const GENERIC_ERROR_MESSAGE =
  "Não foi possível processar o arquivo com IA. Verifique o formato e tente novamente."

const BATCH = {
  id: BATCH_ID,
  tenantId: TENANT_ID,
  fileName: "afd.txt",
  fileUrl: "https://storage/afd.txt",
  fileType: "afd",
  competencia: COMPETENCIA,
  status: "received",
  aiProvider: "console",
  totalRecords: 0,
  correctedRecords: 0,
  errorRecords: 0,
  errorMessage: null,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const STAGED_ROW = {
  id: "row-1",
  tenantId: TENANT_ID,
  batchId: BATCH_ID,
  competencia: COMPETENCIA,
  employeeName: "Ana Silva",
  document: null,
  registration: null,
  departmentName: null,
  roleName: null,
  admissionDate: null,
  terminationDate: null,
  expectedHours: null,
  workedHours: null,
  justifiedAbsenceHours: null,
  unjustifiedAbsenceHours: null,
  absenceRatePercent: null,
  terminationType: null,
  qualityStatus: "pending",
  validationNotes: null,
  rowHash: "hash-1",
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockFindBatch = vi.mocked(findDataImportBatchById)
const mockUpdateBatch = vi.mocked(updateDataImportBatch)
const mockCreateBatch = vi.mocked(createDataImportBatch)
const mockCreateRows = vi.mocked(createEmployeeMonthlyRows)
const mockFindRows = vi.mocked(findEmployeeMonthlyRowsByBatch)
const mockFindRowByHash = vi.mocked(findEmployeeMonthlyRowByHash)
const mockUpdateRow = vi.mocked(updateEmployeeMonthlyRowById)
const mockMarkValidated = vi.mocked(markEmployeeMonthlyRowsValidated)
const mockFindReceivedBatches = vi.mocked(findAllTenantsReceivedDataImportBatches)
const mockFindBatchesByTenantPaginated = vi.mocked(findDataImportBatchesByTenantPaginated)

beforeEach(() => {
  vi.clearAllMocks()
  mockFindBatch.mockResolvedValue(BATCH as Awaited<ReturnType<typeof findDataImportBatchById>>)
  mockUpdateBatch.mockResolvedValue(undefined)
  mockCreateBatch.mockResolvedValue(BATCH as Awaited<ReturnType<typeof createDataImportBatch>>)
  mockCreateRows.mockResolvedValue(1)
  mockFindRows.mockResolvedValue([STAGED_ROW] as Awaited<ReturnType<typeof findEmployeeMonthlyRowsByBatch>>)
  mockFindRowByHash.mockResolvedValue(STAGED_ROW as Awaited<ReturnType<typeof findEmployeeMonthlyRowByHash>>)
  mockUpdateRow.mockResolvedValue(undefined)
  mockMarkValidated.mockResolvedValue(1)
  mockFindReceivedBatches.mockResolvedValue([])
  mockFindBatchesByTenantPaginated.mockResolvedValue({ items: [BATCH], total: 1 } as Awaited<ReturnType<typeof findDataImportBatchesByTenantPaginated>>)
  mockDownload.mockResolvedValue(Buffer.from("conteudo"))
  mockJobAdd.mockResolvedValue(undefined)
  mockGenerate.mockResolvedValue({ text: null, toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } })
})

describe("processDataExtractionWithAI", () => {
  it("lança AppError quando o lote não existe", async () => {
    mockFindBatch.mockResolvedValue(null)

    await expect(processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo")).rejects.toMatchObject({
      code: "DATA_IMPORT_BATCH_NOT_FOUND",
    })
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it("executa a tool save_employee_monthly e persiste as linhas", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "save_employee_monthly",
          arguments: JSON.stringify({ employeeName: "Ana Silva", workedHours: 8.5 }),
        },
      ],
      usage: { inputTokens: 10, outputTokens: 5 },
    })

    const summary = await processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo do arquivo")

    expect(mockCreateRows).toHaveBeenCalledTimes(1)
    const createdRows = mockCreateRows.mock.calls[0]?.[0] ?? []
    expect(createdRows[0]).toMatchObject({ tenantId: TENANT_ID, batchId: BATCH_ID, employeeName: "Ana Silva", workedHours: 8.5 })
    expect(summary).toMatchObject({ status: "extracted", totalRecords: 1 })
  })

  it("marca o lote como failed e relança quando a IA falha", async () => {
    mockGenerate.mockRejectedValue(new Error("AI down"))

    await expect(processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo")).rejects.toThrow("AI down")
    expect(mockUpdateBatch).toHaveBeenCalledWith(TENANT_ID, BATCH_ID, {
      status: "failed",
      errorMessage: GENERIC_ERROR_MESSAGE,
    })
  })
})

describe("validateDataExtractionWithAI", () => {
  it("lança AppError quando o lote não existe", async () => {
    mockFindBatch.mockResolvedValue(null)

    await expect(validateDataExtractionWithAI(TENANT_ID, BATCH_ID)).rejects.toMatchObject({
      code: "DATA_IMPORT_BATCH_NOT_FOUND",
    })
  })

  it("aplica correções e marca as linhas como validadas", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "apply_employee_corrections",
          arguments: JSON.stringify({
            corrections: [{ rowKey: "hash-1", field: "workedHours", value: "9", reason: "valor corrigido" }],
          }),
        },
      ],
      usage: { inputTokens: 10, outputTokens: 5 },
    })

    const summary = await validateDataExtractionWithAI(TENANT_ID, BATCH_ID)

    expect(mockUpdateRow).toHaveBeenCalledWith(TENANT_ID, "row-1", {
      workedHours: 9,
      qualityStatus: "corrected",
      validationNotes: "valor corrigido",
    })
    expect(mockMarkValidated).toHaveBeenCalledWith(TENANT_ID, BATCH_ID)
    expect(summary).toMatchObject({ status: "validated", correctedRecords: 1 })
  })

  it("não chama a IA quando não há linhas extraídas", async () => {
    mockFindRows.mockResolvedValue([])

    const summary = await validateDataExtractionWithAI(TENANT_ID, BATCH_ID)

    expect(mockGenerate).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ status: "validated", totalRecords: 0 })
  })
})

describe("processDataExtractionWithAI — casos adicionais", () => {
  it("divide a fonte em chunks e chama a IA mais de uma vez", async () => {
    const longSource = Array.from({ length: 3000 }, (_, index) => `linha ${String(index)}`).join("\n")

    await processDataExtractionWithAI(TENANT_ID, BATCH_ID, longSource)

    expect(mockGenerate.mock.calls.length).toBeGreaterThan(1)
  })

  it("ignora a tool flag_extraction_error sem criar linhas e contabiliza o erro", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        { id: "call-1", name: "flag_extraction_error", arguments: JSON.stringify({ description: "layout ambíguo" }) },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const summary = await processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo")

    expect(mockCreateRows).not.toHaveBeenCalled()
    expect(summary.errorRecords).toBe(1)
    expect(mockUpdateBatch).toHaveBeenCalledWith(
      TENANT_ID,
      BATCH_ID,
      expect.objectContaining({ status: "extracted", errorRecords: 1 }),
    )
  })

  it("contabiliza flag_extraction_error mesmo com argumentos inválidos", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [{ id: "call-1", name: "flag_extraction_error", arguments: JSON.stringify({}) }],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const summary = await processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo")

    expect(summary.errorRecords).toBe(1)
  })

  it("lança AppError quando a tool retorna argumentos inválidos", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [{ id: "call-1", name: "save_employee_monthly", arguments: JSON.stringify({}) }],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await expect(processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo")).rejects.toMatchObject({
      code: "DATA_EXTRACTION_INVALID_ARGUMENTS",
    })
  })

  it("lança AppError quando os argumentos não são JSON válido", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [{ id: "call-1", name: "save_employee_monthly", arguments: "not-json" }],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await expect(processDataExtractionWithAI(TENANT_ID, BATCH_ID, "conteúdo")).rejects.toMatchObject({
      code: "DATA_EXTRACTION_INVALID_ARGUMENTS",
    })
  })

  it("não chama a IA quando a fonte está vazia", async () => {
    await processDataExtractionWithAI(TENANT_ID, BATCH_ID, "   ")

    expect(mockGenerate).not.toHaveBeenCalled()
  })
})

describe("validateDataExtractionWithAI — correções", () => {
  it("aplica correções de múltiplos campos e converte datas/horas", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "apply_employee_corrections",
          arguments: JSON.stringify({
            corrections: [
              { rowKey: "hash-1", field: "employeeName", value: "Ana Souza" },
              { rowKey: "hash-1", field: "registration", value: "R1" },
              { rowKey: "hash-1", field: "departmentName", value: "TI" },
              { rowKey: "hash-1", field: "roleName", value: "Dev" },
              { rowKey: "hash-1", field: "admissionDate", value: "2024-01-10" },
              { rowKey: "hash-1", field: "terminationDate", value: "nao-e-data" },
              { rowKey: "hash-1", field: "terminationType", value: "voluntario" },
              { rowKey: "hash-1", field: "expectedHours", value: "176" },
              { rowKey: "hash-1", field: "justifiedAbsenceHours", value: "8" },
              { rowKey: "hash-1", field: "unjustifiedAbsenceHours", value: "2" },
              { rowKey: "hash-1", field: "absenceRatePercent", value: "5.7" },
            ],
          }),
        },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const summary = await validateDataExtractionWithAI(TENANT_ID, BATCH_ID)

    expect(mockUpdateRow).toHaveBeenCalledTimes(11)
    expect(mockUpdateRow).toHaveBeenCalledWith(
      TENANT_ID,
      "row-1",
      expect.objectContaining({ admissionDate: new Date("2024-01-10T00:00:00.000Z"), qualityStatus: "corrected" }),
    )
    expect(mockUpdateRow).toHaveBeenCalledWith(
      TENANT_ID,
      "row-1",
      expect.objectContaining({ terminationDate: null }),
    )
    expect(summary.correctedRecords).toBe(11)
  })

  it("ignora correção de linha inexistente", async () => {
    mockFindRowByHash.mockResolvedValue(null)
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "apply_employee_corrections",
          arguments: JSON.stringify({ corrections: [{ rowKey: "nao-existe", field: "employeeName", value: "X" }] }),
        },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const summary = await validateDataExtractionWithAI(TENANT_ID, BATCH_ID)

    expect(mockUpdateRow).not.toHaveBeenCalled()
    expect(summary.correctedRecords).toBe(0)
  })

  it("ignora correção numérica inválida", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "apply_employee_corrections",
          arguments: JSON.stringify({ corrections: [{ rowKey: "hash-1", field: "workedHours", value: "abc" }] }),
        },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const summary = await validateDataExtractionWithAI(TENANT_ID, BATCH_ID)

    expect(mockUpdateRow).not.toHaveBeenCalled()
    expect(summary.correctedRecords).toBe(0)
  })

  it("lança AppError quando a correção vem inválida", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        { id: "call-1", name: "apply_employee_corrections", arguments: JSON.stringify({ corrections: [] }) },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await expect(validateDataExtractionWithAI(TENANT_ID, BATCH_ID)).rejects.toMatchObject({
      code: "DATA_CORRECTION_INVALID_ARGUMENTS",
    })
  })
})

describe("runDataIngestionWithAI", () => {
  it("cria o lote, extrai, valida e retorna as linhas", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        {
          id: "call-1",
          name: "save_employee_monthly",
          arguments: JSON.stringify({ employeeName: "Ana Silva", workedHours: 168.5 }),
        },
      ],
      usage: { inputTokens: 10, outputTokens: 5 },
    })

    const result = await runDataIngestionWithAI(TENANT_ID, {
      competencia: COMPETENCIA,
      fileName: "espelho.txt",
      fileType: "espelho",
      sourceText: "conteúdo do arquivo",
    })

    expect(mockCreateBatch).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ fileName: "espelho.txt", competencia: COMPETENCIA, fileType: "espelho" }),
    )
    expect(result.batch.id).toBe(BATCH_ID)
    expect(result.extraction.status).toBe("extracted")
    expect(result.validation.status).toBe("validated")
    expect(result.rows).toHaveLength(1)
  })
})

describe("enqueueDataIngestionBatch", () => {
  it("cria o lote e enfileira o job de processamento", async () => {
    const batch = await enqueueDataIngestionBatch(TENANT_ID, {
      fileName: "afd.txt",
      fileUrl: "data-ingestion/tenant-1/afd.txt",
      fileType: "txt",
      competencia: COMPETENCIA,
    })

    expect(mockCreateBatch).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ fileName: "afd.txt", fileUrl: "data-ingestion/tenant-1/afd.txt" }),
    )
    expect(mockJobAdd).toHaveBeenCalledWith("data-ingestion-processor", {})
    expect(batch.id).toBe(BATCH_ID)
  })
})

describe("processPendingDataIngestionBatches", () => {
  it("baixa o arquivo e processa os lotes recebidos", async () => {
    mockFindReceivedBatches.mockResolvedValue([BATCH] as Awaited<ReturnType<typeof findAllTenantsReceivedDataImportBatches>>)

    const result = await processPendingDataIngestionBatches()

    expect(mockDownload).toHaveBeenCalledWith(BATCH.fileUrl)
    expect(result).toEqual({ processed: 1, failed: 0 })
  })

  it("marca o lote como failed quando o download falha", async () => {
    mockFindReceivedBatches.mockResolvedValue([BATCH] as Awaited<ReturnType<typeof findAllTenantsReceivedDataImportBatches>>)
    mockDownload.mockRejectedValue(new Error("arquivo ausente"))

    const result = await processPendingDataIngestionBatches()

    expect(result).toEqual({ processed: 0, failed: 1 })
    expect(mockUpdateBatch).toHaveBeenCalledWith(
      TENANT_ID,
      BATCH_ID,
      expect.objectContaining({ status: "failed", errorMessage: GENERIC_ERROR_MESSAGE }),
    )
  })

  it("marca o lote como failed quando não há arquivo persistido", async () => {
    mockFindReceivedBatches.mockResolvedValue([
      { ...BATCH, fileUrl: null },
    ] as Awaited<ReturnType<typeof findAllTenantsReceivedDataImportBatches>>)

    const result = await processPendingDataIngestionBatches()

    expect(result).toEqual({ processed: 0, failed: 1 })
    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockUpdateBatch).toHaveBeenCalledWith(
      TENANT_ID,
      BATCH_ID,
      expect.objectContaining({ status: "failed", errorMessage: GENERIC_ERROR_MESSAGE }),
    )
  })
})

describe("listDataIngestionBatchesPaginated", () => {
  it("lista os lotes do tenant com paginação", async () => {
    const result = await listDataIngestionBatchesPaginated(TENANT_ID, { page: 1, pageSize: 10 })

    expect(mockFindBatchesByTenantPaginated).toHaveBeenCalledWith(TENANT_ID, 0, 10)
    expect(result.total).toBe(1)
  })
})

describe("getDataIngestionBatchFile", () => {
  it("retorna o arquivo quando o lote tem arquivo persistido", async () => {
    mockFindBatch.mockResolvedValue(BATCH as Awaited<ReturnType<typeof findDataImportBatchById>>)
    mockDownload.mockResolvedValue(Buffer.from("conteudo"))

    const file = await getDataIngestionBatchFile(TENANT_ID, BATCH_ID)

    expect(file).toEqual({ fileName: BATCH.fileName, buffer: Buffer.from("conteudo") })
    expect(mockDownload).toHaveBeenCalledWith(BATCH.fileUrl)
  })

  it("retorna null quando o lote não existe", async () => {
    mockFindBatch.mockResolvedValue(null)

    const file = await getDataIngestionBatchFile(TENANT_ID, BATCH_ID)

    expect(file).toBeNull()
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it("retorna null quando o lote não tem arquivo persistido", async () => {
    mockFindBatch.mockResolvedValue({ ...BATCH, fileUrl: null } as Awaited<ReturnType<typeof findDataImportBatchById>>)

    const file = await getDataIngestionBatchFile(TENANT_ID, BATCH_ID)

    expect(file).toBeNull()
    expect(mockDownload).not.toHaveBeenCalled()
  })
})
