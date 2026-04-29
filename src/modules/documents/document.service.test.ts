import { describe, it, expect, vi, beforeEach } from "vitest"
import { addDocumentVersion } from "@/modules/documents/document.service"
import {
  findDocumentById,
  createDocumentVersion,
} from "@/modules/documents/document.repository"

vi.mock("@/modules/documents/document.repository")

const mockFindDocumentById = vi.mocked(findDocumentById)
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
  mockFindDocumentById.mockResolvedValue(makeDoc(1))
  mockCreateDocumentVersion.mockResolvedValue({ id: "new-version" } as Awaited<ReturnType<typeof createDocumentVersion>>)
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

  it("passa fileUrl e uploadedBy ao repository", async () => {
    await addDocumentVersion(TENANT_ID, DOC_ID, "https://storage/v2.pdf", "user-42")

    expect(mockCreateDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({ fileUrl: "https://storage/v2.pdf", uploadedBy: "user-42" }),
    )
  })
})
