"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getStorageService } from "@/libs/integrations"
import { getSession } from "@/modules/auth/session"
import { enqueueDataIngestionBatch } from "@/modules/data-ingestion/data-ingestion.service"

const ALLOWED_EXTENSIONS = ["txt", "csv"]
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const MAX_STORAGE_FILE_NAME_LENGTH = 120

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, MAX_STORAGE_FILE_NAME_LENGTH)
  return sanitized.length > 0 ? sanitized : "arquivo"
}

const competenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Competência deve estar no formato AAAA-MM.")

export async function uploadDataIngestionFileAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const file = formData.get("file")
  const competenciaRaw = formData.get("competencia")

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." }
  }
  if (typeof competenciaRaw !== "string") {
    return { error: "Informe a competência." }
  }

  const parsedCompetencia = competenciaSchema.safeParse(competenciaRaw)
  if (!parsedCompetencia.success) {
    return { error: parsedCompetencia.error.issues[0]?.message ?? "Competência inválida." }
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { error: "Formato não suportado. Envie um arquivo .txt ou .csv." }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Arquivo muito grande (máximo 20 MB)." }
  }

  try {
    const storageKey = `data-ingestion/${session.tenantId}/${String(Date.now())}-${sanitizeFileName(file.name)}`
    await getStorageService().upload({ file, path: storageKey })
    await enqueueDataIngestionBatch(session.tenantId, {
      fileName: file.name,
      fileUrl: storageKey,
      fileType: extension,
      competencia: parsedCompetencia.data,
      createdById: session.userId,
    })
    revalidatePath("/workforce/import")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
