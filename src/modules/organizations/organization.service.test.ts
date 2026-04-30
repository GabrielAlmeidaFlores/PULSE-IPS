import { describe, it, expect, vi, beforeEach } from "vitest"
import { createOrg, getOrganization, updateOrg, getOrganizationForAdmin, getOrganizationBilling, getOrganizationsForExport, getOrganizationFullDetail, getAllOrganizations, getAllOrganizationsPaginatedAdmin } from "@/modules/organizations/organization.service"
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
  findAllOrganizations,
  findAllOrganizationsPaginatedAdmin,
} from "@/modules/organizations/organization.repository"
import { getBillingService } from "@/libs/integrations"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"

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
const mockFindAllOrganizations = vi.mocked(findAllOrganizations)
const mockFindAllOrganizationsPaginatedAdmin = vi.mocked(findAllOrganizationsPaginatedAdmin)

const ORG = { id: "org-1", slug: "acme", name: "Acme Corp", externalCustomerId: "cus_123" }

const mockBillingCreateCustomer = vi.fn().mockResolvedValue({ id: "cus_new123" })

const MOCK_BILLING_SERVICE = {
  createProduct: vi.fn(),
  createPrice: vi.fn(),
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
  createCustomer: mockBillingCreateCustomer,
  cancelSubscription: vi.fn(),
  constructWebhookEvent: vi.fn(),
} as IBillingService

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateOrganization.mockResolvedValue(ORG as Awaited<ReturnType<typeof createOrganization>>)
  mockUpdateOrgCustomerId.mockResolvedValue(undefined)
  mockBillingCreateCustomer.mockResolvedValue({ id: "cus_new123" })
  mockGetBillingService.mockReturnValue(MOCK_BILLING_SERVICE)
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

    const result = await createOrg({ slug: "acme", name: "Acme Corp" })

    expect(mockBillingCreateCustomer).toHaveBeenCalledWith("acme@pulse.app", "Acme Corp")
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

describe("getAllOrganizations", () => {
  it("delega ao repository e retorna lista", async () => {
    mockFindAllOrganizations.mockResolvedValue([{ id: ORG.id }] as Awaited<ReturnType<typeof findAllOrganizations>>)

    const result = await getAllOrganizations()

    expect(mockFindAllOrganizations).toHaveBeenCalled()
    expect(result).toEqual([{ id: ORG.id }])
  })
})

describe("getAllOrganizationsPaginatedAdmin", () => {
  it("calcula skip e repassa ao repository sem filtros", async () => {
    mockFindAllOrganizationsPaginatedAdmin.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findAllOrganizationsPaginatedAdmin>>)

    await getAllOrganizationsPaginatedAdmin({ page: 2, pageSize: 10 })

    expect(mockFindAllOrganizationsPaginatedAdmin).toHaveBeenCalledWith({}, 10, 10)
  })

  it("inclui filtro de busca quando q está presente", async () => {
    mockFindAllOrganizationsPaginatedAdmin.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findAllOrganizationsPaginatedAdmin>>)

    await getAllOrganizationsPaginatedAdmin({ page: 1, pageSize: 5, q: "acme" })

    expect(mockFindAllOrganizationsPaginatedAdmin).toHaveBeenCalledWith({ q: "acme" }, 0, 5)
  })
})
