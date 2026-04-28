import { describe, it, expect, vi, beforeEach } from "vitest"
import { createOrg, getOrganization, updateOrg, getOrganizationForAdmin, getOrganizationBilling, getOrganizationsForExport, getOrganizationFullDetail } from "@/modules/organizations/organization.service"
import {
  findOrganizationBySlug,
  createOrganization,
  updateOrganizationCustomerId,
  findOrganizationById,
  updateOrganization,
  findOrganizationForAdmin,
  findOrganizationBilling,
  findAllOrganizationsForExport,
  findOrganizationFullDetail,
} from "@/modules/organizations/organization.repository"
import { getBillingService } from "@/libs/integrations"

vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/libs/integrations")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindOrgBySlug = vi.mocked(findOrganizationBySlug)
const mockCreateOrganization = vi.mocked(createOrganization)
const mockUpdateOrgCustomerId = vi.mocked(updateOrganizationCustomerId)
const mockFindOrgById = vi.mocked(findOrganizationById)
const mockGetBillingService = vi.mocked(getBillingService)
const mockUpdateOrganization = vi.mocked(updateOrganization)
const mockFindOrgForAdmin = vi.mocked(findOrganizationForAdmin)
const mockFindOrgBilling = vi.mocked(findOrganizationBilling)
const mockFindAllOrgsForExport = vi.mocked(findAllOrganizationsForExport)
const mockFindOrgFullDetail = vi.mocked(findOrganizationFullDetail)

const ORG = { id: "org-1", slug: "acme", name: "Acme Corp", externalCustomerId: "cus_123" }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateOrganization.mockResolvedValue(ORG as Awaited<ReturnType<typeof createOrganization>>)
  mockUpdateOrgCustomerId.mockResolvedValue(undefined)
})

describe("createOrg", () => {
  it("throws when slug is already taken", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationBySlug>>)

    await expect(createOrg({ slug: "acme", name: "Acme 2" })).rejects.toMatchObject({
      code: "SLUG_TAKEN",
    })
    expect(mockCreateOrganization).not.toHaveBeenCalled()
  })

  it("creates org and registers billing customer when slug is available", async () => {
    mockFindOrgBySlug.mockResolvedValue(null)
    const mockCreateCustomer = vi.fn().mockResolvedValue({ id: "cus_new123" })
    mockGetBillingService.mockReturnValue({ createCustomer: mockCreateCustomer } as unknown as ReturnType<typeof getBillingService>)

    const result = await createOrg({ slug: "acme", name: "Acme Corp" })

    expect(mockCreateCustomer).toHaveBeenCalledWith("acme@pulse.app", "Acme Corp")
    expect(mockCreateOrganization).toHaveBeenCalledOnce()
    expect(mockUpdateOrgCustomerId).toHaveBeenCalledWith(ORG.id, "cus_new123")
    expect(result).toEqual(ORG)
  })
})

describe("getOrganization", () => {
  it("returns org when found", async () => {
    mockFindOrgById.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationById>>)
    const result = await getOrganization(ORG.id)
    expect(result).toEqual(ORG)
  })

  it("returns null when not found", async () => {
    mockFindOrgById.mockResolvedValue(null)
    const result = await getOrganization("org-x")
    expect(result).toBeNull()
  })
})

describe("updateOrg", () => {
  it("updates organization fields and returns updated record", async () => {
    mockUpdateOrganization.mockResolvedValue({ id: ORG.id, name: "Updated" } as Awaited<ReturnType<typeof updateOrganization>>)
    const result = await updateOrg(ORG.id, { name: "Updated" })
    expect(mockUpdateOrganization).toHaveBeenCalledWith(ORG.id, { name: "Updated" })
    expect(result).toEqual({ id: ORG.id, name: "Updated" })
  })
})

describe("getOrganizationForAdmin", () => {
  it("calls findOrgForAdmin and returns result", async () => {
    mockFindOrgForAdmin.mockResolvedValue({ id: ORG.id } as Awaited<ReturnType<typeof findOrganizationForAdmin>>)
    const result = await getOrganizationForAdmin(ORG.id)
    expect(mockFindOrgForAdmin).toHaveBeenCalledWith(ORG.id)
    expect(result).toEqual({ id: ORG.id })
  })
})

describe("getOrganizationBilling", () => {
  it("calls findOrgBilling and returns result", async () => {
    mockFindOrgBilling.mockResolvedValue({ id: ORG.id } as Awaited<ReturnType<typeof findOrganizationBilling>>)
    const result = await getOrganizationBilling(ORG.id)
    expect(mockFindOrgBilling).toHaveBeenCalledWith(ORG.id)
    expect(result).toEqual({ id: ORG.id })
  })
})

describe("getOrganizationsForExport", () => {
  it("calls findAllOrgsForExport and returns result", async () => {
    mockFindAllOrgsForExport.mockResolvedValue([{ id: ORG.id }] as Awaited<ReturnType<typeof findAllOrganizationsForExport>>)
    const result = await getOrganizationsForExport()
    expect(mockFindAllOrgsForExport).toHaveBeenCalled()
    expect(result).toEqual([{ id: ORG.id }])
  })
})

describe("getOrganizationFullDetail", () => {
  it("calls findOrgFullDetail and returns result", async () => {
    mockFindOrgFullDetail.mockResolvedValue({ id: ORG.id } as Awaited<ReturnType<typeof findOrganizationFullDetail>>)
    const result = await getOrganizationFullDetail(ORG.id)
    expect(mockFindOrgFullDetail).toHaveBeenCalledWith(ORG.id)
    expect(result).toEqual({ id: ORG.id })
  })
})
