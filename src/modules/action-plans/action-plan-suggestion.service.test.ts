import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  runActionPlanSuggestionGenerator,
  generateActionPlanSuggestionsForTenant,
  getPendingActionPlanSuggestions,
} from "@/modules/action-plans/action-plan-suggestion.service"
import { findAllTenantsActiveOrganizationIds } from "@/modules/organizations/organization.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { computeRawSuggestions } from "@/modules/action-plans/suggestions"
import {
  findExistingActionPlanSuggestionKeysForTenant,
  createActionPlanSuggestion,
  findPendingActionPlanSuggestions,
} from "@/modules/action-plans/action-plan-suggestion.repository"

vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/billing/billing.service")
vi.mock("@/modules/action-plans/suggestions")
vi.mock("@/modules/action-plans/action-plan-suggestion.repository")

const mockFindAllTenants = vi.mocked(findAllTenantsActiveOrganizationIds)
const mockHasTenantPlanFeature = vi.mocked(hasTenantPlanFeature)
const mockComputeRawSuggestions = vi.mocked(computeRawSuggestions)
const mockFindExistingKeys = vi.mocked(findExistingActionPlanSuggestionKeysForTenant)
const mockCreateSuggestion = vi.mocked(createActionPlanSuggestion)
const mockFindPendingSuggestions = vi.mocked(findPendingActionPlanSuggestions)

const TENANT_ID = "tenant-1"
const TENANTS = [{ id: TENANT_ID }, { id: "tenant-2" }]

const RAW_SUGGESTION = {
  key: "alert-score_drop-dept-1-2026-04",
  title: "Plano para queda de score",
  description: "Score caiu no setor Engineering",
  priority: "high" as const,
  reason: "Queda de 2 pontos detectada",
  tasks: ["Reunião de alinhamento"],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindAllTenants.mockResolvedValue(TENANTS)
  mockHasTenantPlanFeature.mockResolvedValue(true)
  mockComputeRawSuggestions.mockResolvedValue([RAW_SUGGESTION])
  mockFindExistingKeys.mockResolvedValue([])
  mockCreateSuggestion.mockResolvedValue(undefined)
  mockFindPendingSuggestions.mockResolvedValue([])
})

describe("runActionPlanSuggestionGenerator", () => {
  it("retorna zeros quando não há tenants ativos", async () => {
    mockFindAllTenants.mockResolvedValue([])

    const result = await runActionPlanSuggestionGenerator()

    expect(result).toEqual({ created: 0, skipped: 0, tenants: 0 })
    expect(mockComputeRawSuggestions).not.toHaveBeenCalled()
  })

  it("pula tenant sem feature action_plans", async () => {
    mockFindAllTenants.mockResolvedValue([{ id: TENANT_ID }])
    mockHasTenantPlanFeature.mockResolvedValue(false)

    const result = await runActionPlanSuggestionGenerator()

    expect(result).toEqual({ created: 0, skipped: 0, tenants: 1 })
    expect(mockComputeRawSuggestions).not.toHaveBeenCalled()
  })

  it("agrega resultados de todos os tenants com feature", async () => {
    mockFindAllTenants.mockResolvedValue([{ id: "t1" }, { id: "t2" }])
    mockHasTenantPlanFeature.mockResolvedValue(true)
    mockComputeRawSuggestions.mockResolvedValue([RAW_SUGGESTION])
    mockFindExistingKeys.mockResolvedValue([])

    const result = await runActionPlanSuggestionGenerator()

    expect(result.created).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.tenants).toBe(2)
  })
})

describe("generateActionPlanSuggestionsForTenant", () => {
  it("cria sugestão nova quando a chave não existe ainda", async () => {
    mockFindExistingKeys.mockResolvedValue([])

    const result = await generateActionPlanSuggestionsForTenant(TENANT_ID)

    expect(mockCreateSuggestion).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ suggestionKey: RAW_SUGGESTION.key }),
    )
    expect(result).toEqual({ created: 1, skipped: 0 })
  })

  it("pula sugestão cujo key já existe (deduplicação)", async () => {
    mockFindExistingKeys.mockResolvedValue([
      { suggestionKey: RAW_SUGGESTION.key },
    ])

    const result = await generateActionPlanSuggestionsForTenant(TENANT_ID)

    expect(mockCreateSuggestion).not.toHaveBeenCalled()
    expect(result).toEqual({ created: 0, skipped: 1 })
  })

  it("cria apenas sugestões com chaves novas e pula as duplicadas", async () => {
    const newSuggestion = { ...RAW_SUGGESTION, key: "nova-chave-2" }
    mockComputeRawSuggestions.mockResolvedValue([RAW_SUGGESTION, newSuggestion])
    mockFindExistingKeys.mockResolvedValue([
      { suggestionKey: RAW_SUGGESTION.key },
    ])

    const result = await generateActionPlanSuggestionsForTenant(TENANT_ID)

    expect(mockCreateSuggestion).toHaveBeenCalledTimes(1)
    expect(mockCreateSuggestion).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ suggestionKey: "nova-chave-2" }),
    )
    expect(result).toEqual({ created: 1, skipped: 1 })
  })

  it("retorna zeros quando não há candidatos", async () => {
    mockComputeRawSuggestions.mockResolvedValue([])

    const result = await generateActionPlanSuggestionsForTenant(TENANT_ID)

    expect(mockCreateSuggestion).not.toHaveBeenCalled()
    expect(result).toEqual({ created: 0, skipped: 0 })
  })
})

describe("getPendingActionPlanSuggestions", () => {
  it("delega ao repository", async () => {
    await getPendingActionPlanSuggestions(TENANT_ID)

    expect(mockFindPendingSuggestions).toHaveBeenCalledWith(TENANT_ID)
  })
})
