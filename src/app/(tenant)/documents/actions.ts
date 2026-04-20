"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { getSession } from "@/modules/auth/session"
import { createNewDocument, addDocumentVersion, getDocument, getDocumentVersions } from "@/modules/documents/document.service"
import type { DocumentVersionItem } from "@/modules/documents/document.types"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const ALLOWED_TYPES = ["policy", "procedure", "pgr", "pcmso", "other"] as const
type DocType = (typeof ALLOWED_TYPES)[number]

function isDocType(value: unknown): value is DocType {
  return ALLOWED_TYPES.includes(value as DocType)
}

async function uploadFile(tenantId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin"
  const key = `tenants/${tenantId}/documents/${randomUUID()}.${ext}`
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
  if (!type || !isDocType(type)) return { error: "Tipo inválido." }
  if (!file || file.size === 0) return { error: "Arquivo é obrigatório." }

  try {
    const key = await uploadFile(session.tenantId, file)
    const doc = await createNewDocument(session.tenantId, { title, type, fileUrl: key })
    await addDocumentVersion(session.tenantId, doc.id, key, session.email)
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

  const documentId = (formData.get("documentId") as string | null) ?? ""
  const file = formData.get("file") as File | null

  if (!documentId) return { error: "Documento inválido." }
  if (!file || file.size === 0) return { error: "Arquivo é obrigatório." }

  try {
    const doc = await getDocument(session.tenantId, documentId)
    if (!doc) return { error: "Documento não encontrado." }

    const key = await uploadFile(session.tenantId, file)
    await addDocumentVersion(session.tenantId, documentId, key, session.email)
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

  try {
    const versions = await getDocumentVersions(session.tenantId, documentId)
    return {
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        uploadedBy: v.uploadedBy,
        createdAt: v.createdAt,
      })),
    }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
