export interface DocumentType {
  id: string
  tenantId: string
  title: string
  type: string
  fileUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateDocumentInput {
  title: string
  type: "policy" | "procedure" | "pgr" | "pcmso" | "other"
  fileUrl?: string
}

export interface CreateDocumentVersionInput {
  documentId: string
  version: number
  fileUrl: string
  uploadedBy: string
}

export interface DocumentVersionItem {
  id: string
  version: number
  uploadedBy: string
  createdAt: Date
}
