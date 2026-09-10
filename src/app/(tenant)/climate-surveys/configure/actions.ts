"use server"

import ExcelJS from "exceljs"
import { extractText } from "unpdf"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import { logger } from "@/libs/logger"
import { enforceRateLimit } from "@/libs/rate-limit"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { deactivateClimateSurveyConfig } from "@/modules/climate-surveys/climate-survey-config.service"
import {
  extractClimateSurveyQuestionsFromFile,
  type ExtractedClimateSurveyQuestion,
} from "@/modules/climate-surveys/climate-survey-import.service"

export async function deactivateClimateSurveyConfigAction(configId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedConfigId = z.string().uuid().safeParse(configId)
  if (!parsedConfigId.success) return { error: "Pesquisa inválida." }

  try {
    await deactivateClimateSurveyConfig(session.tenantId, parsedConfigId.data)
    revalidatePath("/climate-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

const SPREADSHEET_EXTENSIONS = ["xlsx"]
const TEXT_EXTENSIONS = ["csv", "txt"]
const PDF_EXTENSIONS = ["pdf"]
const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024

export interface ExtractClimateSurveyQuestionsResult extends ActionResult {
  questions?: ExtractedClimateSurveyQuestion[]
}

function spreadsheetCellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("")
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text
  }
  return ""
}

async function readSpreadsheetAsText(file: File): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const lines: string[] = []
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values)
      lines.push(values.map((value) => spreadsheetCellToText(value)).join("\t"))
    })
  })
  return lines.join("\n")
}

async function readPdfAsText(file: File): Promise<string> {
  const { text } = await extractText(new Uint8Array(await file.arrayBuffer()), { mergePages: true })
  return text
}

export async function extractClimateSurveyQuestionsAction(
  formData: FormData,
): Promise<ExtractClimateSurveyQuestionsResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) {
    return { error: "Funcionalidade indisponível no seu plano." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." }
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  const isSpreadsheet = SPREADSHEET_EXTENSIONS.includes(extension)
  const isText = TEXT_EXTENSIONS.includes(extension)
  const isPdf = PDF_EXTENSIONS.includes(extension)
  if (!isSpreadsheet && !isText && !isPdf) {
    return { error: "Formato não suportado. Envie um arquivo .xlsx, .csv, .txt ou .pdf." }
  }
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return { error: "Arquivo muito grande (máximo 10 MB)." }
  }

  const rateLimitError = await enforceRateLimit(`climate-survey-import:${session.tenantId}`, 10, 300)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    let sourceText: string
    if (isSpreadsheet) {
      sourceText = await readSpreadsheetAsText(file)
    } else if (isPdf) {
      sourceText = await readPdfAsText(file)
    } else {
      sourceText = await file.text()
    }
    const questions = await extractClimateSurveyQuestionsFromFile(session.tenantId, sourceText)
    return { questions }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    logger.error({ err }, "falha ao importar perguntas de pesquisa de clima")
    return { error: "Não foi possível importar as perguntas. Verifique o arquivo e tente novamente." }
  }
}
