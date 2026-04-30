import { prisma } from "@/libs/db"
import type { Prisma, Document } from "@prisma/client"
import type { CreateDocumentInput, CreateDocumentVersionInput } from "@/modules/documents/document.types"

export interface DocumentVersionRow {
  id: string
  documentId: string
  version: number
  fileUrl: string
  uploadedById: string | null
  createdAt: Date
  uploadedBy: { name: string } | null
}

export type DocumentWithVersions = Document & { versions: DocumentVersionRow[] }
export type DocumentWithLatestVersion = Document & { versions: DocumentVersionRow[] }

const versionSelect = {
  id: true,
  documentId: true,
  version: true,
  fileUrl: true,
  uploadedById: true,
  createdAt: true,
  uploadedBy: { select: { name: true } },
} as const

export function findDocumentsByTenant(tenantId: string): Promise<DocumentWithLatestVersion[]> {
  return prisma.document.findMany({
    where: { tenantId, isActive: true },
    include: { versions: { select: versionSelect, orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  })
}

export function findDocumentById(tenantId: string, documentId: string): Promise<DocumentWithVersions | null> {
  return prisma.document.findFirst({
    where: { id: documentId, tenantId },
    include: { versions: { select: versionSelect, orderBy: { version: "desc" } } },
  })
}

export function createDocument(tenantId: string, data: CreateDocumentInput): Promise<Document> {
  return prisma.document.create({ data: { ...data, tenantId } })
}

export function createDocumentVersion(data: CreateDocumentVersionInput): Promise<DocumentVersionRow> {
  return prisma.documentVersion.create({
    data,
    select: versionSelect,
  })
}

export function findVersionsByDocument(tenantId: string, documentId: string): Promise<DocumentVersionRow[]> {
  return prisma.documentVersion.findMany({
    where: { documentId, document: { tenantId } },
    select: versionSelect,
    orderBy: { version: "desc" },
  })
}

export function findVersionByIdForDownload(tenantId: string, documentId: string, versionId: string): Promise<DocumentVersionRow | null> {
  return prisma.documentVersion.findFirst({
    where: { id: versionId, documentId, document: { tenantId } },
    select: versionSelect,
  })
}

export function updateDocument(
  tenantId: string,
  documentId: string,
  data: Partial<CreateDocumentInput & { isActive: boolean }>,
): Promise<{ count: number }> {
  return prisma.document.updateMany({ where: { id: documentId, tenantId }, data })
}

export interface DocumentListingFilters {
  q?: string
}

export async function findDocumentsForListingPage(
  tenantId: string,
  filters: DocumentListingFilters,
  skip: number,
  take: number,
): Promise<{ items: DocumentWithLatestVersion[]; total: number }> {
  const where: Prisma.DocumentWhereInput = { tenantId, isActive: true }
  if (filters.q !== undefined) {
    where.title = { contains: filters.q, mode: "insensitive" }
  }
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { versions: { select: versionSelect, orderBy: { version: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    prisma.document.count({ where }),
  ])
  return { items, total }
}
