import { createHash } from "crypto"
import { env } from "@/env"
import { AppError } from "@/libs/errors/app-error"
import { getAIService, getStorageService } from "@/libs/integrations"
import type { AIToolDefinition } from "@/libs/integrations/ai/ai.interface"
import { getJobQueue } from "@/libs/queue"
import { createLogger } from "@/libs/utils/logger"
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
  type CreateEmployeeMonthlyRowInput,
  type UpdateEmployeeMonthlyRowPatch,
} from "@/modules/data-ingestion/data-ingestion.repository"
import {
  dataCorrectionsToolSchema,
  dataExtractionErrorToolSchema,
  dataExtractionRowSchema,
  type DataCorrectionArgs,
  type DataExtractionRowArgs,
} from "@/modules/data-ingestion/data-ingestion.schema"
import type {
  DataExtractionSummary,
  DataImportBatch,
  DataIngestionContext,
  EmployeeMonthlyRow,
} from "@/modules/data-ingestion/data-ingestion.types"

const logger = createLogger("data-ingestion")

const MAX_SOURCE_CHARS_PER_AI_CALL = 12000

const DATA_INGESTION_GENERIC_ERROR =
  "Não foi possível processar o arquivo com IA. Verifique o formato e tente novamente."

function resolveDataIngestionErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message
  return DATA_INGESTION_GENERIC_ERROR
}

const EXTRACTION_SYSTEM_PROMPT = [
  "Você é um extrator de dados operacionais da plataforma Pulse.",
  "Receberá o conteúdo de um arquivo de ponto/espelho/planilha (texto) e deve extrair registros mensais por colaborador.",
  "Regras:",
  "- Chame a ferramenta save_employee_monthly uma vez para cada colaborador identificado.",
  "- Datas no formato AAAA-MM-DD. Horas em decimal (ex.: 08:30 => 8.5).",
  "- Não invente dados: se um campo não existir no arquivo, omita-o.",
  "- Se houver ambiguidade relevante, registre uma flag_extraction_error.",
].join("\n")

const VALIDATION_SYSTEM_PROMPT = [
  "Você é um validador de dados operacionais da plataforma Pulse.",
  "Receberá registros já extraídos (JSON) e deve revisar consistência e corrigir pequenos erros.",
  "Regras:",
  "- Só corrija quando houver evidência de erro (formato de data, horas negativas, percentuais fora de faixa, campos trocados).",
  "- Use a ferramenta apply_employee_corrections com rowKey exato, campo e novo valor.",
  "- Se não houver nada a corrigir, não chame nenhuma ferramenta.",
].join("\n")

const SAVE_EMPLOYEE_MONTHLY_TOOL: AIToolDefinition = {
  name: "save_employee_monthly",
  description:
    "Salva um registro mensal de um colaborador (1 colaborador × 1 competência). Chame uma vez para cada colaborador identificado no arquivo.",
  parameters: {
    type: "object",
    properties: {
      employeeName: {
        type: "string",
        description: "Nome completo do colaborador. Ex.: 'Ana Silva'.",
      },
      document: {
        type: "string",
        description: "Documento (CPF) apenas com dígitos, sem pontos ou traços. Ex.: '12345678909'. Omita se não existir no arquivo.",
      },
      registration: {
        type: "string",
        description: "Matrícula/registro do colaborador no sistema de ponto. Ex.: '031608'. Omita se não existir.",
      },
      departmentName: {
        type: "string",
        description: "Nome do setor/departamento. Ex.: 'Área Técnica'.",
      },
      roleName: {
        type: "string",
        description: "Cargo/função. Ex.: 'Operador Injetora Júnior'.",
      },
      admissionDate: {
        type: "string",
        description: "Data de admissão no formato AAAA-MM-DD. Ex.: '2024-02-26'.",
      },
      terminationDate: {
        type: "string",
        description: "Data de demissão no formato AAAA-MM-DD. Ex.: '2026-07-31'. Omita se o colaborador estiver ativo.",
      },
      expectedHours: {
        type: "number",
        description: "Horas previstas no mês, em decimal. Ex.: 176.",
      },
      workedHours: {
        type: "number",
        description: "Horas trabalhadas no mês, em decimal. Ex.: 168.5.",
      },
      justifiedAbsenceHours: {
        type: "number",
        description: "Horas de ausência justificada no mês, em decimal. Ex.: 8.",
      },
      unjustifiedAbsenceHours: {
        type: "number",
        description: "Horas de ausência injustificada (falta) no mês, em decimal. Ex.: 4.",
      },
      absenceRatePercent: {
        type: "number",
        description: "Percentual de absenteísmo no mês, de 0 a 100. Ex.: 4.5.",
      },
      terminationType: {
        type: "string",
        description: "Tipo de desligamento quando houver: 'voluntario' ou 'involuntario'. Omita se o colaborador estiver ativo.",
      },
    },
    required: ["employeeName"],
  },
}

const FLAG_EXTRACTION_ERROR_TOOL: AIToolDefinition = {
  name: "flag_extraction_error",
  description:
    "Sinaliza um problema de extração que não pôde ser resolvido (layout ambíguo, campo ilegível, inconsistência).",
  parameters: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description:
          "Descrição objetiva do problema. Ex.: 'Coluna de horas de ausência ilegível no espelho do colaborador João'.",
      },
    },
    required: ["description"],
  },
}

const APPLY_EMPLOYEE_CORRECTIONS_TOOL: AIToolDefinition = {
  name: "apply_employee_corrections",
  description:
    "Aplica pequenas correções em registros já extraídos. Use apenas quando houver evidência clara de erro.",
  parameters: {
    type: "object",
    properties: {
      corrections: {
        type: "array",
        description: "Lista de correções a aplicar.",
        items: {
          type: "object",
          properties: {
            rowKey: {
              type: "string",
              description: "Chave exata do registro a corrigir (rowKey retornado na extração). Ex.: 'a1b2c3d4...'.",
            },
            field: {
              type: "string",
              enum: [
                "employeeName",
                "registration",
                "departmentName",
                "roleName",
                "admissionDate",
                "terminationDate",
                "expectedHours",
                "workedHours",
                "justifiedAbsenceHours",
                "unjustifiedAbsenceHours",
                "absenceRatePercent",
                "terminationType",
              ],
              description: "Campo a corrigir.",
            },
            value: {
              type: "string",
              description:
                "Novo valor, sempre como texto. Datas em AAAA-MM-DD (ex.: '2024-01-15'); horas e percentuais em decimal (ex.: '8.5', '4.5').",
            },
            reason: {
              type: "string",
              description: "Motivo da correção. Ex.: 'Data em formato inválido no arquivo original'.",
            },
          },
          required: ["rowKey", "field", "value"],
        },
      },
    },
    required: ["corrections"],
  },
}

function parseJsonArguments(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function parseDateOrNull(value: string | undefined): Date | null {
  if (value === undefined) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function computeRowHash(competencia: string, row: DataExtractionRowArgs): string {
  const basis = [competencia, row.document, row.registration, row.employeeName].join("|")
  return createHash("sha256").update(basis).digest("hex")
}

function toCreateRow(context: DataIngestionContext, row: DataExtractionRowArgs): CreateEmployeeMonthlyRowInput {
  return {
    tenantId: context.tenantId,
    batchId: context.batchId,
    competencia: context.competencia,
    employeeName: row.employeeName,
    document: row.document ?? null,
    registration: row.registration ?? null,
    departmentName: row.departmentName ?? null,
    roleName: row.roleName ?? null,
    admissionDate: parseDateOrNull(row.admissionDate),
    terminationDate: parseDateOrNull(row.terminationDate),
    expectedHours: row.expectedHours ?? null,
    workedHours: row.workedHours ?? null,
    justifiedAbsenceHours: row.justifiedAbsenceHours ?? null,
    unjustifiedAbsenceHours: row.unjustifiedAbsenceHours ?? null,
    absenceRatePercent: row.absenceRatePercent ?? null,
    terminationType: row.terminationType ?? null,
    rowHash: computeRowHash(context.competencia, row),
  }
}

function parseNumericCorrection(value: string): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildCorrectionPatch(correction: DataCorrectionArgs): UpdateEmployeeMonthlyRowPatch | null {
  switch (correction.field) {
    case "employeeName":
      return { employeeName: correction.value }
    case "registration":
      return { registration: correction.value }
    case "departmentName":
      return { departmentName: correction.value }
    case "roleName":
      return { roleName: correction.value }
    case "admissionDate":
      return { admissionDate: parseDateOrNull(correction.value) }
    case "terminationDate":
      return { terminationDate: parseDateOrNull(correction.value) }
    case "terminationType":
      return { terminationType: correction.value }
    case "expectedHours": {
      const parsed = parseNumericCorrection(correction.value)
      return parsed !== null ? { expectedHours: parsed } : null
    }
    case "workedHours": {
      const parsed = parseNumericCorrection(correction.value)
      return parsed !== null ? { workedHours: parsed } : null
    }
    case "justifiedAbsenceHours": {
      const parsed = parseNumericCorrection(correction.value)
      return parsed !== null ? { justifiedAbsenceHours: parsed } : null
    }
    case "unjustifiedAbsenceHours": {
      const parsed = parseNumericCorrection(correction.value)
      return parsed !== null ? { unjustifiedAbsenceHours: parsed } : null
    }
    case "absenceRatePercent": {
      const parsed = parseNumericCorrection(correction.value)
      return parsed !== null ? { absenceRatePercent: parsed } : null
    }
  }
}

async function handleSaveEmployeeMonthly(context: DataIngestionContext, rawArguments: string): Promise<void> {
  const parsed = dataExtractionRowSchema.safeParse(parseJsonArguments(rawArguments))
  if (!parsed.success) {
    throw new AppError("DATA_EXTRACTION_INVALID_ARGUMENTS", "A IA retornou um registro inválido na extração.")
  }
  await createEmployeeMonthlyRows([toCreateRow(context, parsed.data)])
}

async function handleApplyEmployeeCorrections(context: DataIngestionContext, rawArguments: string): Promise<number> {
  const parsed = dataCorrectionsToolSchema.safeParse(parseJsonArguments(rawArguments))
  if (!parsed.success) {
    throw new AppError("DATA_CORRECTION_INVALID_ARGUMENTS", "A IA retornou uma correção inválida.")
  }

  let applied = 0
  for (const correction of parsed.data.corrections) {
    const patch = buildCorrectionPatch(correction)
    if (patch === null) continue
    const row = await findEmployeeMonthlyRowByHash(context.tenantId, context.batchId, correction.rowKey)
    if (row === null) continue
    await updateEmployeeMonthlyRowById(context.tenantId, row.id, {
      ...patch,
      qualityStatus: "corrected",
      ...(correction.reason !== undefined ? { validationNotes: correction.reason } : {}),
    })
    applied += 1
  }
  return applied
}

function handleFlagExtractionError(batchId: string, rawArguments: string): void {
  const parsed = dataExtractionErrorToolSchema.safeParse(parseJsonArguments(rawArguments))
  const description = parsed.success ? parsed.data.description : "problema não especificado"
  logger.warn("IA sinalizou problema de extração", { batchId, description })
}

function splitSourceIntoChunks(sourceText: string): string[] {
  const normalized = sourceText.trim()
  if (normalized.length === 0) return []
  if (normalized.length <= MAX_SOURCE_CHARS_PER_AI_CALL) return [normalized]

  const lines = normalized.split("\n")
  const chunks: string[] = []
  let current = ""
  for (const line of lines) {
    if (current.length > 0 && current.length + line.length + 1 > MAX_SOURCE_CHARS_PER_AI_CALL) {
      chunks.push(current)
      current = line
    } else {
      current = current.length > 0 ? `${current}\n${line}` : line
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

export async function processDataExtractionWithAI(
  tenantId: string,
  batchId: string,
  sourceText: string,
): Promise<DataExtractionSummary> {
  const batch = await findDataImportBatchById(tenantId, batchId)
  if (batch === null) {
    throw new AppError("DATA_IMPORT_BATCH_NOT_FOUND", "Lote de importação não encontrado.")
  }

  const context: DataIngestionContext = { tenantId, batchId, competencia: batch.competencia }
  await updateDataImportBatch(tenantId, batchId, { status: "processing", errorMessage: null })

  const chunks = splitSourceIntoChunks(sourceText)
  const ai = getAIService()
  let errorRecords = 0

  try {
    for (const chunk of chunks) {
      const result = await ai.generate({
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: chunk }],
        tools: [SAVE_EMPLOYEE_MONTHLY_TOOL, FLAG_EXTRACTION_ERROR_TOOL],
        tier: "medium",
      })
      for (const call of result.toolCalls) {
        if (call.name === SAVE_EMPLOYEE_MONTHLY_TOOL.name) {
          await handleSaveEmployeeMonthly(context, call.arguments)
        } else if (call.name === FLAG_EXTRACTION_ERROR_TOOL.name) {
          handleFlagExtractionError(batchId, call.arguments)
          errorRecords += 1
        }
      }
    }
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "erro desconhecido"
    logger.error(`falha na extração com IA do lote ${batchId}: ${rawMessage}`)
    await updateDataImportBatch(tenantId, batchId, {
      status: "failed",
      errorMessage: resolveDataIngestionErrorMessage(error),
    })
    throw error
  }

  const rows = await findEmployeeMonthlyRowsByBatch(tenantId, batchId)
  await updateDataImportBatch(tenantId, batchId, {
    status: "extracted",
    totalRecords: rows.length,
    errorRecords,
  })

  return {
    batchId,
    status: "extracted",
    totalRecords: rows.length,
    correctedRecords: 0,
    errorRecords,
  }
}

export async function validateDataExtractionWithAI(
  tenantId: string,
  batchId: string,
): Promise<DataExtractionSummary> {
  const batch = await findDataImportBatchById(tenantId, batchId)
  if (batch === null) {
    throw new AppError("DATA_IMPORT_BATCH_NOT_FOUND", "Lote de importação não encontrado.")
  }

  const rows = await findEmployeeMonthlyRowsByBatch(tenantId, batchId)
  const context: DataIngestionContext = { tenantId, batchId, competencia: batch.competencia }

  let correctedRecords = 0
  if (rows.length > 0) {
    const ai = getAIService()
    const payload = rows.map((row) => ({
      rowKey: row.rowHash,
      employeeName: row.employeeName,
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
    }))

    const result = await ai.generate({
      system: VALIDATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
      tools: [APPLY_EMPLOYEE_CORRECTIONS_TOOL],
      tier: "high",
    })

    for (const call of result.toolCalls) {
      if (call.name === APPLY_EMPLOYEE_CORRECTIONS_TOOL.name) {
        correctedRecords += await handleApplyEmployeeCorrections(context, call.arguments)
      }
    }

    await markEmployeeMonthlyRowsValidated(tenantId, batchId)
  }

  await updateDataImportBatch(tenantId, batchId, { status: "validated", correctedRecords })

  return {
    batchId,
    status: "validated",
    totalRecords: rows.length,
    correctedRecords,
    errorRecords: 0,
  }
}

export interface RunDataIngestionInput {
  competencia: string
  fileName: string
  fileType: string
  sourceText: string
}

export interface RunDataIngestionResult {
  batch: DataImportBatch
  extraction: DataExtractionSummary
  validation: DataExtractionSummary
  rows: EmployeeMonthlyRow[]
}

export async function runDataIngestionWithAI(
  tenantId: string,
  input: RunDataIngestionInput,
): Promise<RunDataIngestionResult> {
  const batch = await createDataImportBatch(tenantId, {
    fileName: input.fileName,
    fileType: input.fileType,
    competencia: input.competencia,
    aiProvider: env.AI_PROVIDER,
  })

  const extraction = await processDataExtractionWithAI(tenantId, batch.id, input.sourceText)
  const validation = await validateDataExtractionWithAI(tenantId, batch.id)
  const rows = await findEmployeeMonthlyRowsByBatch(tenantId, batch.id)

  return { batch, extraction, validation, rows }
}

export interface EnqueueDataIngestionBatchInput {
  fileName: string
  fileUrl: string
  fileType: string
  competencia: string
  createdById?: string
}

export async function enqueueDataIngestionBatch(
  tenantId: string,
  input: EnqueueDataIngestionBatchInput,
): Promise<DataImportBatch> {
  const batch = await createDataImportBatch(tenantId, {
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    fileType: input.fileType,
    competencia: input.competencia,
    aiProvider: env.AI_PROVIDER,
    ...(input.createdById !== undefined ? { createdById: input.createdById } : {}),
  })
  await getJobQueue().add("data-ingestion-processor", {})
  return batch
}

export interface DataIngestionBatchListingQuery {
  page: number
  pageSize: number
}

export function listDataIngestionBatchesPaginated(
  tenantId: string,
  query: DataIngestionBatchListingQuery,
): Promise<{ items: DataImportBatch[]; total: number }> {
  const skip = (query.page - 1) * query.pageSize
  return findDataImportBatchesByTenantPaginated(tenantId, skip, query.pageSize)
}

export interface DataIngestionBatchFile {
  fileName: string
  buffer: Buffer
}

export async function getDataIngestionBatchFile(
  tenantId: string,
  batchId: string,
): Promise<DataIngestionBatchFile | null> {
  const batch = await findDataImportBatchById(tenantId, batchId)
  if (batch === null) return null
  if (batch.fileUrl === null) return null
  const buffer = await getStorageService().download(batch.fileUrl)
  return { fileName: batch.fileName, buffer }
}

export interface ProcessPendingDataIngestionResult {
  processed: number
  failed: number
}

export async function processPendingDataIngestionBatches(): Promise<ProcessPendingDataIngestionResult> {
  const batches = await findAllTenantsReceivedDataImportBatches()
  let processed = 0
  let failed = 0

  for (const batch of batches) {
    try {
      if (batch.fileUrl === null) {
        await updateDataImportBatch(batch.tenantId, batch.id, {
          status: "failed",
          errorMessage: DATA_INGESTION_GENERIC_ERROR,
        })
        failed += 1
        continue
      }
      const buffer = await getStorageService().download(batch.fileUrl)
      const sourceText = buffer.toString("utf-8")
      await processDataExtractionWithAI(batch.tenantId, batch.id, sourceText)
      await validateDataExtractionWithAI(batch.tenantId, batch.id)
      processed += 1
    } catch (error) {
      failed += 1
      const rawMessage = error instanceof Error ? error.message : "erro desconhecido"
      await updateDataImportBatch(batch.tenantId, batch.id, {
        status: "failed",
        errorMessage: resolveDataIngestionErrorMessage(error),
      })
      logger.error(`falha ao processar lote ${batch.id}: ${rawMessage}`)
    }
  }

  return { processed, failed }
}
