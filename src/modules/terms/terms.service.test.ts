import { describe, it, expect, vi, beforeEach } from "vitest"
import type { CreateTermsVersionInput } from "@/modules/terms/terms.types"
import { getPendingTermsForUser, acceptTerms, getActiveTermsVersion, getTermsVersionById, createNewTermsVersion, getAllTermsVersions, getAcceptancesByVersion } from "@/modules/terms/terms.service"
import {
  findActiveTermsVersion,
  findUserAcceptance,
  findTermsVersionById,
  createTermsAcceptance,
  createTermsVersion,
  findAllTermsVersions,
  findAcceptancesByVersion,
} from "@/modules/terms/terms.repository"

vi.mock("@/modules/terms/terms.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindActiveTermsVersion = vi.mocked(findActiveTermsVersion)
const mockFindTermsVersionById = vi.mocked(findTermsVersionById)
const mockFindUserAcceptance = vi.mocked(findUserAcceptance)
const mockCreateTermsAcceptance = vi.mocked(createTermsAcceptance)
const mockCreateTermsVersion = vi.mocked(createTermsVersion)
const mockFindAllTermsVersions = vi.mocked(findAllTermsVersions)
const mockFindAcceptancesByVersion = vi.mocked(findAcceptancesByVersion)

const TERMS = { id: "terms-1", version: "1.0", content: "<p>Termos</p>", isActive: true, effectiveDate: new Date() }
const ACCEPTANCE = { id: "acc-1", userId: "user-1", termsVersionId: "terms-1", acceptedAt: new Date(), createdAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateTermsAcceptance.mockResolvedValue(ACCEPTANCE as Awaited<ReturnType<typeof createTermsAcceptance>>)
})

describe("getPendingTermsForUser", () => {
  it("returns null when no active terms version exists", async () => {
    mockFindActiveTermsVersion.mockResolvedValue(null)

    const result = await getPendingTermsForUser("user-1")
    expect(result).toBeNull()
  })

  it("returns null when user already accepted active terms", async () => {
    mockFindActiveTermsVersion.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findActiveTermsVersion>>)
    mockFindUserAcceptance.mockResolvedValue(ACCEPTANCE as Awaited<ReturnType<typeof findUserAcceptance>>)

    const result = await getPendingTermsForUser("user-1")
    expect(result).toBeNull()
  })

  it("returns active terms when user has not accepted", async () => {
    mockFindActiveTermsVersion.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findActiveTermsVersion>>)
    mockFindUserAcceptance.mockResolvedValue(null)

    const result = await getPendingTermsForUser("user-1")
    expect(result).toEqual(TERMS)
  })
})

describe("acceptTerms", () => {
  it("throws when terms version not found", async () => {
    mockFindTermsVersionById.mockResolvedValue(null)

    await expect(acceptTerms({ termsVersionId: "bad-id", userId: "user-1", ipAddress: "127.0.0.1", userAgent: "test" })).rejects.toMatchObject({
      code: "TERMS_NOT_FOUND",
    })
  })

  it("throws when terms version is inactive", async () => {
    mockFindTermsVersionById.mockResolvedValue({ ...TERMS, isActive: false } as Awaited<ReturnType<typeof findTermsVersionById>>)

    await expect(acceptTerms({ termsVersionId: "terms-1", userId: "user-1", ipAddress: "127.0.0.1", userAgent: "test" })).rejects.toMatchObject({
      code: "TERMS_INACTIVE",
    })
  })

  it("returns existing acceptance when user already accepted", async () => {
    mockFindTermsVersionById.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findTermsVersionById>>)
    mockFindUserAcceptance.mockResolvedValue(ACCEPTANCE as Awaited<ReturnType<typeof findUserAcceptance>>)

    const result = await acceptTerms({ termsVersionId: "terms-1", userId: "user-1", ipAddress: "127.0.0.1", userAgent: "test" })
    expect(result).toEqual(ACCEPTANCE)
    expect(mockCreateTermsAcceptance).not.toHaveBeenCalled()
  })

  it("creates new acceptance when not yet accepted", async () => {
    mockFindTermsVersionById.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findTermsVersionById>>)
    mockFindUserAcceptance.mockResolvedValue(null)

    const result = await acceptTerms({ termsVersionId: "terms-1", userId: "user-1", ipAddress: "127.0.0.1", userAgent: "test" })
    expect(result).toEqual(ACCEPTANCE)
    expect(mockCreateTermsAcceptance).toHaveBeenCalledOnce()
  })
})

describe("getActiveTermsVersion", () => {
  it("returns the currently active terms version", async () => {
    mockFindActiveTermsVersion.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findActiveTermsVersion>>)
    const result = await getActiveTermsVersion()
    expect(result).toEqual(TERMS)
  })
})

describe("getTermsVersionById", () => {
  it("returns a terms version by id", async () => {
    mockFindTermsVersionById.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findTermsVersionById>>)

    const result = await getTermsVersionById("terms-1")
    expect(result).toEqual(TERMS)
    expect(mockFindTermsVersionById).toHaveBeenCalledWith("terms-1")
  })
})

describe("createNewTermsVersion", () => {
  it("creates a new terms version and returns it", async () => {
    const newTerms = { ...TERMS, id: "terms-2", version: "2.0" }
    mockCreateTermsVersion.mockResolvedValue(newTerms as Awaited<ReturnType<typeof createTermsVersion>>)

    const result = await createNewTermsVersion({ version: "2.0", content: "<p>v2</p>", effectiveDate: new Date(), isActive: true } as CreateTermsVersionInput)
    expect(result).toEqual(newTerms)
    expect(mockCreateTermsVersion).toHaveBeenCalledOnce()
  })
})

describe("acceptTerms — already accepted", () => {
  it("returns existing acceptance without creating a new one", async () => {
    mockFindTermsVersionById.mockResolvedValue(TERMS as Awaited<ReturnType<typeof findTermsVersionById>>)
    mockFindUserAcceptance.mockResolvedValue(ACCEPTANCE as Awaited<ReturnType<typeof findUserAcceptance>>)

    const result = await acceptTerms({ termsVersionId: "terms-1", userId: "user-1", ipAddress: "127.0.0.1", userAgent: "test" })
    expect(result).toEqual(ACCEPTANCE)
    expect(mockCreateTermsAcceptance).not.toHaveBeenCalled()
  })
})

describe("getAllTermsVersions", () => {
  it("returns all terms versions", async () => {
    mockFindAllTermsVersions.mockResolvedValue([TERMS] as Awaited<ReturnType<typeof findAllTermsVersions>>)

    const result = await getAllTermsVersions()
    expect(result).toEqual([TERMS])
    expect(mockFindAllTermsVersions).toHaveBeenCalledOnce()
  })
})

describe("getAcceptancesByVersion", () => {
  it("returns all acceptances for a given terms version", async () => {
    const acceptances = [{ id: "acc-1" }]
    mockFindAcceptancesByVersion.mockResolvedValue(acceptances as Awaited<ReturnType<typeof findAcceptancesByVersion>>)

    const result = await getAcceptancesByVersion("terms-1")
    expect(result).toEqual(acceptances)
    expect(mockFindAcceptancesByVersion).toHaveBeenCalledWith("terms-1")
  })
})
