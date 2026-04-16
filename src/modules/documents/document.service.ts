import { AppError } from "@/libs/errors/app-error"
import {
  findDocumentsByTenant,
  findDocumentById,
  createDocument,
  createDocumentVersion,
} from "@/modules/documents/document.repository"
import type { CreateDocumentInput } from "@/modules/documents/document.types"

export function getDocuments(tenantId: string): ReturnType<typeof findDocumentsByTenant> {
  return findDocumentsByTenant(tenantId)
}

export function getDocument(tenantId: string, documentId: string): ReturnType<typeof findDocumentById> {
  return findDocumentById(tenantId, documentId)
}

export function createNewDocument(tenantId: string, input: CreateDocumentInput): ReturnType<typeof createDocument> {
  return createDocument(tenantId, input)
}

export async function addDocumentVersion(
  tenantId: string,
  documentId: string,
  fileUrl: string,
  uploadedBy: string,
): ReturnType<typeof createDocumentVersion> {
  const doc = await findDocumentById(tenantId, documentId)
  if (!doc) throw new AppError("DOCUMENT_NOT_FOUND", "Documento não encontrado.")

  const currentVersion = doc.versions[0]?.version ?? 0

  return createDocumentVersion({
    documentId,
    version: currentVersion + 1,
    fileUrl,
    uploadedBy,
  })
}
