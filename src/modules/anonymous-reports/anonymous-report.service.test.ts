import { describe, it, expect, vi, beforeEach } from "vitest"
import { submitReport, updateReportStatus, getReports, getReport, getReportsPaginated } from "@/modules/anonymous-reports/anonymous-report.service"
import { createReport, updateReport, findReportsByTenant, findReportById, findReportsForListingPage } from "@/modules/anonymous-reports/anonymous-report.repository"
import { findOrganizationBySlug } from "@/modules/organizations/organization.repository"

vi.mock("@/modules/anonymous-reports/anonymous-report.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockCreateReport = vi.mocked(createReport)
const mockUpdateReport = vi.mocked(updateReport)
const mockFindOrgBySlug = vi.mocked(findOrganizationBySlug)
const mockFindReportsByTenant = vi.mocked(findReportsByTenant)
const mockFindReportById = vi.mocked(findReportById)
const mockFindReportsForListingPage = vi.mocked(findReportsForListingPage)

const ORG = { id: "org-1", slug: "acme" }
const REPORT_INPUT = { orgSlug: "acme", content: "Relato anônimo" }
const CREATED_REPORT = { id: "rep-1", ...REPORT_INPUT, tenantId: "org-1", status: "open", createdAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateReport.mockResolvedValue(CREATED_REPORT as Awaited<ReturnType<typeof createReport>>)
  mockUpdateReport.mockResolvedValue({ count: 1 })
})

describe("submitReport", () => {
  it("throws when organization not found for slug", async () => {
    mockFindOrgBySlug.mockResolvedValue(null)

    await expect(submitReport("unknown-org", REPORT_INPUT)).rejects.toMatchObject({
      code: "ORGANIZATION_NOT_FOUND",
    })
  })

  it("creates report with resolved tenantId", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationBySlug>>)

    const result = await submitReport("acme", REPORT_INPUT)

    expect(mockCreateReport).toHaveBeenCalledWith(ORG.id, expect.objectContaining(REPORT_INPUT))
    expect(result).toEqual(CREATED_REPORT)
  })
})

describe("updateReportStatus", () => {
  it("updates report with provided status", async () => {
    await updateReportStatus("org-1", "rep-1", { status: "analyzing" })

    expect(mockUpdateReport).toHaveBeenCalledWith("org-1", "rep-1", { status: "analyzing", resolvedAt: null })
  })

  it("adds resolvedAt timestamp when status is resolved", async () => {
    await updateReportStatus("org-1", "rep-1", { status: "resolved" })

    expect(mockUpdateReport).toHaveBeenCalledWith(
      "org-1",
      "rep-1",
      expect.objectContaining({ status: "resolved", resolvedAt: expect.any(Date) }),
    )
  })

  it("does not add resolvedAt for other statuses", async () => {
    await updateReportStatus("org-1", "rep-1", { status: "open" })

    const callArg = mockUpdateReport.mock.calls[0]?.[2]
    expect(callArg).toHaveProperty("resolvedAt", null)
  })
})

describe("getReports", () => {
  it("returns reports for the given tenant", async () => {
    mockFindReportsByTenant.mockResolvedValue([CREATED_REPORT] as Awaited<ReturnType<typeof findReportsByTenant>>)

    const result = await getReports("org-1")
    expect(result).toEqual([CREATED_REPORT])
    expect(mockFindReportsByTenant).toHaveBeenCalledWith("org-1")
  })
})

describe("getReport", () => {
  it("returns a single report by id", async () => {
    mockFindReportById.mockResolvedValue(CREATED_REPORT as Awaited<ReturnType<typeof findReportById>>)

    const result = await getReport("org-1", "rep-1")
    expect(result).toEqual(CREATED_REPORT)
    expect(mockFindReportById).toHaveBeenCalledWith("org-1", "rep-1")
  })
})

describe("getReportsPaginated", () => {
  it("calcula skip e repassa filtros ao repository", async () => {
    mockFindReportsForListingPage.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findReportsForListingPage>>)

    await getReportsPaginated("org-1", { page: 2, pageSize: 10, status: "open", category: "harassment" })

    expect(mockFindReportsForListingPage).toHaveBeenCalledWith("org-1", { status: "open", category: "harassment" }, 10, 10)
  })

  it("omite filtros ausentes", async () => {
    mockFindReportsForListingPage.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findReportsForListingPage>>)

    await getReportsPaginated("org-1", { page: 1, pageSize: 5 })

    expect(mockFindReportsForListingPage).toHaveBeenCalledWith("org-1", {}, 0, 5)
  })
})
