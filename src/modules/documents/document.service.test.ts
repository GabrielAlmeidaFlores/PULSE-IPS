import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  addDocumentVersion,
  getDocuments,
  getDocument,
  getDocumentVersions,
  getDocumentVersionForDownload,
  createNewDocument,
  getDocumentsPaginated,
} from "@/modules/documents/document.service"
import {
  findDocumentById,
  findDocumentsByTenant,
  findVersionsByDocument,
  findVersionByIdForDownload,
  findDocumentsForListingPage,
  createDocument,
  createDocumentVersion,
} from "@/modules/documents/document.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"

vi.mock("@/modules/documents/document.repository")
vi.mock("@/modules/audit/audit.repository")

const mockCreateAuditLog = vi.mocked(createAuditLog)
const mockFindDocumentById = vi.mocked(findDocumentById)
const mockFindDocumentsByTenant = vi.mocked(findDocumentsByTenant)
const mockFindVersionsByDocument = vi.mocked(findVersionsByDocument)
const mockFindVersionByIdForDownload = vi.mocked(findVersionByIdForDownload)
const mockFindDocumentsForListingPage = vi.mocked(findDocumentsForListingPage)
const mockCreateDocument = vi.mocked(createDocument)
const mockCreateDocumentVersion = vi.mocked(createDocumentVersion)

const TENANT_ID = "tenant-1"
const DOC_ID = "doc-1"

function makeDoc(latestVersion: number): Awaited<ReturnType<typeof findDocumentById>> {
  return {
    id: DOC_ID,
    tenantId: TENANT_ID,
    versions: latestVersion > 0 ? [{ id: "v-1", version: latestVersion }] : [],
  } as Awaited<ReturnType<typeof findDocumentById>>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateAuditLog.mockResolvedValue(undefined)
  mockFindDocumentById.mockResolvedValue(makeDoc(1))
  mockCreateDocumentVersion.mockResolvedValue({ id: "new-version" } as Awaited<ReturnType<typeof createDocumentVersion>>)
})

describe("getDocuments", () => {
  it("retorna todos os documentos do tenant", async () => {
    const docs = [{ id: DOC_ID }] as Awaited<ReturnType<typeof findDocumentsByTenant>>
    mockFindDocumentsByTenant.mockResolvedValue(docs)

    const result = await getDocuments(TENANT_ID)
    expect(result).toEqual(docs)
    expect(mockFindDocumentsByTenant).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("getDocument", () => {
  it("retorna documento pelo id", async () => {
    const doc = makeDoc(1)
    mockFindDocumentById.mockResolvedValue(doc)

    const result = await getDocument(TENANT_ID, DOC_ID)
    expect(result).toEqual(doc)
    expect(mockFindDocumentById).toHaveBeenCalledWith(TENANT_ID, DOC_ID)
  })

  it("retorna null quando documento não existe", async () => {
    mockFindDocumentById.mockResolvedValue(null)

    const result = await getDocument(TENANT_ID, "non-existent")
    expect(result).toBeNull()
  })
})

describe("getDocumentVersions", () => {
  it("retorna versões do documento", async () => {
    const versions = [{ id: "v-1", version: 1 }, { id: "v-2", version: 2 }] as Awaited<ReturnType<typeof findVersionsByDocument>>
    mockFindVersionsByDocument.mockResolvedValue(versions)

    const result = await getDocumentVersions(TENANT_ID, DOC_ID)
    expect(result).toEqual(versions)
    expect(mockFindVersionsByDocument).toHaveBeenCalledWith(TENANT_ID, DOC_ID)
  })
})

describe("getDocumentVersionForDownload", () => {
  it("retorna versão específica para download", async () => {
    const version = { id: "v-1", fileUrl: "https://storage/v1.pdf" } as Awaited<ReturnType<typeof findVersionByIdForDownload>>
    mockFindVersionByIdForDownload.mockResolvedValue(version)

    const result = await getDocumentVersionForDownload(TENANT_ID, DOC_ID, "v-1")
    expect(result).toEqual(version)
    expect(mockFindVersionByIdForDownload).toHaveBeenCalledWith(TENANT_ID, DOC_ID, "v-1")
  })

  it("retorna null quando versão não existe", async () => {
    mockFindVersionByIdForDownload.mockResolvedValue(null)

    const result = await getDocumentVersionForDownload(TENANT_ID, DOC_ID, "non-existent")
    expect(result).toBeNull()
  })
})

describe("createNewDocument", () => {
  it("cria documento, registra log de auditoria e o retorna", async () => {
    const created = { id: "new-doc", tenantId: TENANT_ID, title: "Relatório" } as Awaited<ReturnType<typeof createDocument>>
    mockCreateDocument.mockResolvedValue(created)

    const input = { title: "Relatório", type: "policy" as const } as Parameters<typeof createNewDocument>[1]
    const result = await createNewDocument(TENANT_ID, input, "user-1")

    expect(result).toEqual(created)
    expect(mockCreateDocument).toHaveBeenCalledWith(TENANT_ID, input)
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, userId: "user-1", action: "document.created" }),
    )
  })
})

describe("getDocumentsPaginated", () => {
  it("calcula skip e repassa para o repository", async () => {
    const paged = { items: [], total: 0 } as Awaited<ReturnType<typeof findDocumentsForListingPage>>
    mockFindDocumentsForListingPage.mockResolvedValue(paged)

    await getDocumentsPaginated(TENANT_ID, { page: 3, pageSize: 10 })

    expect(mockFindDocumentsForListingPage).toHaveBeenCalledWith(TENANT_ID, {}, 20, 10)
  })

  it("repassa filtro de busca quando q está definido", async () => {
    const paged = { items: [], total: 0 } as Awaited<ReturnType<typeof findDocumentsForListingPage>>
    mockFindDocumentsForListingPage.mockResolvedValue(paged)

    await getDocumentsPaginated(TENANT_ID, { page: 1, pageSize: 10, q: "pgr" })

    expect(mockFindDocumentsForListingPage).toHaveBeenCalledWith(TENANT_ID, { q: "pgr" }, 0, 10)
  })

  it("não inclui filtro q quando não definido", async () => {
    const paged = { items: [], total: 0 } as Awaited<ReturnType<typeof findDocumentsForListingPage>>
    mockFindDocumentsForListingPage.mockResolvedValue(paged)

    await getDocumentsPaginated(TENANT_ID, { page: 1, pageSize: 10 })

    expect(mockFindDocumentsForListingPage).toHaveBeenCalledWith(TENANT_ID, {}, 0, 10)
  })
})

describe("addDocumentVersion", () => {
  it("lança AppError quando documento não existe", async () => {
    mockFindDocumentById.mockResolvedValue(null)

    await expect(
      addDocumentVersion(TENANT_ID, DOC_ID, "https://storage/file.pdf", "user-1"),
    ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" })

    expect(mockCreateDocumentVersion).not.toHaveBeenCalled()
  })

  it("cria versão com número incrementado a partir da versão atual", async () => {
    mockFindDocumentById.mockResolvedValue(makeDoc(3))

    await addDocumentVersion(TENANT_ID, DOC_ID, "https://storage/file.pdf", "user-1")

    expect(mockCreateDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: DOC_ID, version: 4 }),
    )
  })

  it("cria versão 1 quando documento ainda não tem versões", async () => {
    mockFindDocumentById.mockResolvedValue(makeDoc(0))

    await addDocumentVersion(TENANT_ID, DOC_ID, "https://storage/file.pdf", "user-1")

    expect(mockCreateDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1 }),
    )
  })

  it("passa fileUrl e uploadedById ao repository", async () => {
    await addDocumentVersion(TENANT_ID, DOC_ID, "https://storage/v2.pdf", "user-42")

    expect(mockCreateDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({ fileUrl: "https://storage/v2.pdf", uploadedById: "user-42" }),
    )
  })
})
