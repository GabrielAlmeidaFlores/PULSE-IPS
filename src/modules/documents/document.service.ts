import { AppError } from "@/libs/errors/app-error"
import {
  findDocumentsByTenant,
  findDocumentById,
  findVersionsByDocument,
  findVersionByIdForDownload,
  findDocumentsForListingPage,
  createDocument,
  createDocumentVersion,
  type DocumentListingFilters,
} from "@/modules/documents/document.repository"
import type { CreateDocumentInput } from "@/modules/documents/document.types"

export function getDocuments(tenantId: string): ReturnType<typeof findDocumentsByTenant> {
  return findDocumentsByTenant(tenantId)
}

export function getDocument(tenantId: string, documentId: string): ReturnType<typeof findDocumentById> {
  return findDocumentById(tenantId, documentId)
}

export function getDocumentVersions(tenantId: string, documentId: string): ReturnType<typeof findVersionsByDocument> {
  return findVersionsByDocument(tenantId, documentId)
}

export function getDocumentVersionForDownload(tenantId: string, documentId: string, versionId: string): ReturnType<typeof findVersionByIdForDownload> {
  return findVersionByIdForDownload(tenantId, documentId, versionId)
}

export function createNewDocument(tenantId: string, input: CreateDocumentInput): ReturnType<typeof createDocument> {
  return createDocument(tenantId, input)
}

export async function addDocumentVersion(
  tenantId: string,
  documentId: string,
  fileUrl: string,
  uploadedById: string,
): ReturnType<typeof createDocumentVersion> {
  const doc = await findDocumentById(tenantId, documentId)
  if (!doc) throw new AppError("DOCUMENT_NOT_FOUND", "Documento não encontrado.")

  const currentVersion = doc.versions[0]?.version ?? 0

  return createDocumentVersion({
    documentId,
    version: currentVersion + 1,
    fileUrl,
    uploadedById,
  })
}

interface DocumentListingQuery {
  q?: string
  page: number
  pageSize: number
}

export function getDocumentsPaginated(
  tenantId: string,
  query: DocumentListingQuery,
): ReturnType<typeof findDocumentsForListingPage> {
  const skip = (query.page - 1) * query.pageSize
  const filters: DocumentListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  return findDocumentsForListingPage(tenantId, filters, skip, query.pageSize)
}
