"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { getSession } from "@/modules/auth/session"
import { createNewDocument, addDocumentVersion, getDocument, getDocumentVersions } from "@/modules/documents/document.service"
import type { DocumentVersionItem } from "@/modules/documents/document.types"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const documentIdSchema = z.string().uuid()

const ALLOWED_TYPES = ["policy", "procedure", "pgr", "pcmso", "other"] as const
type DocType = (typeof ALLOWED_TYPES)[number]

function isDocType(value: unknown): value is DocType {
  return ALLOWED_TYPES.includes(value as DocType)
}

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg"])
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

async function uploadFile(tenantId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new AppError("FILE_TOO_LARGE", "O arquivo excede o limite de 20 MB.")
  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(rawExt)) throw new AppError("FILE_TYPE_INVALID", "Tipo de arquivo não permitido.")
  const key = `tenants/${tenantId}/documents/${randomUUID()}.${rawExt}`
  const { getStorageService } = await import("@/libs/integrations")
  await getStorageService().upload({ file, path: key })
  return key
}

export async function createDocumentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const title = (formData.get("title") as string | null)?.trim() ?? ""
  const type = formData.get("type") as string | null
  const file = formData.get("file") as File | null

  if (!title) return { error: "Título é obrigatório." }
  if (title.length > 255) return { error: "Título deve ter no máximo 255 caracteres." }
  if (!type || !isDocType(type)) return { error: "Tipo inválido." }
  if (!file || file.size === 0) return { error: "Arquivo é obrigatório." }

  try {
    const key = await uploadFile(session.tenantId, file)
    const doc = await createNewDocument(session.tenantId, { title, type, fileUrl: key }, session.userId)
    await addDocumentVersion(session.tenantId, doc.id, key, session.userId)
    revalidatePath("/documents")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function uploadDocumentVersionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const rawDocumentId = formData.get("documentId") as string | null
  const file = formData.get("file") as File | null

  if (!rawDocumentId) return { error: "Documento inválido." }
  const docIdParsed = documentIdSchema.safeParse(rawDocumentId)
  if (!docIdParsed.success) return { error: "Documento inválido." }
  if (!file || file.size === 0) return { error: "Arquivo é obrigatório." }

  try {
    const doc = await getDocument(session.tenantId, docIdParsed.data)
    if (!doc) return { error: "Documento não encontrado." }

    const key = await uploadFile(session.tenantId, file)
    await addDocumentVersion(session.tenantId, docIdParsed.data, key, session.userId)
    revalidatePath("/documents")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export type { DocumentVersionItem } from "@/modules/documents/document.types"

interface VersionsResult extends ActionResult {
  versions?: DocumentVersionItem[]
}

export async function getDocumentVersionsAction(documentId: string): Promise<VersionsResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsed = documentIdSchema.safeParse(documentId)
  if (!parsed.success) return { error: "ID inválido." }

  try {
    const versions = await getDocumentVersions(session.tenantId, parsed.data)
    return {
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        uploadedByName: v.uploadedBy?.name ?? null,
        createdAt: v.createdAt,
      })),
    }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
