import { prisma } from "@/libs/db"
import type { Document, DocumentVersion } from "@prisma/client"
import type { CreateDocumentInput, CreateDocumentVersionInput } from "@/modules/documents/document.types"

export type DocumentWithVersions = Document & { versions: DocumentVersion[] }
export type DocumentWithLatestVersion = Document & { versions: DocumentVersion[] }

export function findDocumentsByTenant(tenantId: string): Promise<DocumentWithLatestVersion[]> {
  return prisma.document.findMany({
    where: { tenantId, isActive: true },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  })
}

export function findDocumentById(tenantId: string, documentId: string): Promise<DocumentWithVersions | null> {
  return prisma.document.findFirst({
    where: { id: documentId, tenantId },
    include: { versions: { orderBy: { version: "desc" } } },
  })
}

export function createDocument(tenantId: string, data: CreateDocumentInput): Promise<Document> {
  return prisma.document.create({ data: { ...data, tenantId } })
}

export function createDocumentVersion(data: CreateDocumentVersionInput): Promise<DocumentVersion> {
  return prisma.documentVersion.create({ data })
}

export function updateDocument(
  tenantId: string,
  documentId: string,
  data: Partial<CreateDocumentInput & { isActive: boolean }>,
): Promise<{ count: number }> {
  return prisma.document.updateMany({ where: { id: documentId, tenantId }, data })
}
