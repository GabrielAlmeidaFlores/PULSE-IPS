import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getActivePrivacyPolicyVersion,
  getAllPrivacyPolicyVersions,
  getPrivacyPolicyVersionById,
  createNewPrivacyPolicyVersion,
} from "@/modules/privacy-policy/privacy-policy.service"
import {
  findActivePrivacyPolicyVersion,
  findAllPrivacyPolicyVersions,
  findPrivacyPolicyVersionById,
  createPrivacyPolicyVersion,
} from "@/modules/privacy-policy/privacy-policy.repository"
import type { CreatePrivacyPolicyVersionInput } from "@/modules/privacy-policy/privacy-policy.types"

vi.mock("@/modules/privacy-policy/privacy-policy.repository")

const mockFindActive = vi.mocked(findActivePrivacyPolicyVersion)
const mockFindAll = vi.mocked(findAllPrivacyPolicyVersions)
const mockFindById = vi.mocked(findPrivacyPolicyVersionById)
const mockCreate = vi.mocked(createPrivacyPolicyVersion)

const VERSION = {
  id: "ppv-1",
  version: "1.0.0",
  title: "Política de Privacidade",
  content: "<p>Conteúdo</p>",
  isActive: true,
  effectiveAt: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindActive.mockResolvedValue(VERSION as Awaited<ReturnType<typeof findActivePrivacyPolicyVersion>>)
  mockFindAll.mockResolvedValue([VERSION] as Awaited<ReturnType<typeof findAllPrivacyPolicyVersions>>)
  mockFindById.mockResolvedValue(VERSION as Awaited<ReturnType<typeof findPrivacyPolicyVersionById>>)
  mockCreate.mockResolvedValue(VERSION as Awaited<ReturnType<typeof createPrivacyPolicyVersion>>)
})

describe("getActivePrivacyPolicyVersion", () => {
  it("retorna versão ativa do repository", async () => {
    const result = await getActivePrivacyPolicyVersion()
    expect(mockFindActive).toHaveBeenCalledOnce()
    expect(result).toEqual(VERSION)
  })
})

describe("getAllPrivacyPolicyVersions", () => {
  it("retorna todas as versões do repository", async () => {
    const result = await getAllPrivacyPolicyVersions()
    expect(mockFindAll).toHaveBeenCalledOnce()
    expect(result).toEqual([VERSION])
  })
})

describe("getPrivacyPolicyVersionById", () => {
  it("busca versão por ID no repository", async () => {
    const result = await getPrivacyPolicyVersionById("ppv-1")
    expect(mockFindById).toHaveBeenCalledWith("ppv-1")
    expect(result).toEqual(VERSION)
  })
})

describe("createNewPrivacyPolicyVersion", () => {
  it("cria nova versão via repository", async () => {
    const input: CreatePrivacyPolicyVersionInput = {
      version: "2.0.0",
      title: "Política v2",
      content: "<p>Novo conteúdo</p>",
      effectiveAt: new Date("2026-06-01"),
    }

    const result = await createNewPrivacyPolicyVersion(input)

    expect(mockCreate).toHaveBeenCalledWith(input)
    expect(result).toEqual(VERSION)
  })
})
