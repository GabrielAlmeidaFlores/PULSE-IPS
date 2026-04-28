import { findAllTenantsActiveOrganizationIds } from "@/modules/organizations/organization.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { computeRawSuggestions } from "@/modules/action-plans/suggestions"
import {
  findExistingActionPlanSuggestionKeysForTenant,
  createActionPlanSuggestion,
  findPendingActionPlanSuggestions,
  dismissActionPlanSuggestion,
  convertActionPlanSuggestion,
  type ActionPlanSuggestionWithTasks,
} from "@/modules/action-plans/action-plan-suggestion.repository"

export type { ActionPlanSuggestionWithTasks }
export { dismissActionPlanSuggestion, convertActionPlanSuggestion }

export async function runActionPlanSuggestionGenerator(): Promise<{ created: number; skipped: number; tenants: number }> {
  const tenants = await findAllTenantsActiveOrganizationIds()

  let totalCreated = 0
  let totalSkipped = 0

  for (const tenant of tenants) {
    const hasFeature = await hasTenantPlanFeature(tenant.id, "action_plans")
    if (!hasFeature) continue
    const { created, skipped } = await generateActionPlanSuggestionsForTenant(tenant.id)
    totalCreated += created
    totalSkipped += skipped
  }

  return { created: totalCreated, skipped: totalSkipped, tenants: tenants.length }
}

export async function generateActionPlanSuggestionsForTenant(tenantId: string): Promise<{ created: number; skipped: number }> {
  const [candidates, existingKeys] = await Promise.all([
    computeRawSuggestions(tenantId),
    findExistingActionPlanSuggestionKeysForTenant(tenantId),
  ])

  const blockedKeys = new Set(existingKeys.map((e) => e.suggestionKey))

  let created = 0
  let skipped = 0

  for (const candidate of candidates) {
    if (blockedKeys.has(candidate.key)) {
      skipped++
      continue
    }

    await createActionPlanSuggestion(tenantId, {
      suggestionKey: candidate.key,
      title: candidate.title,
      description: candidate.description,
      priority: candidate.priority,
      reason: candidate.reason,
      tasks: candidate.tasks,
    })
    created++
  }

  return { created, skipped }
}

export function getPendingActionPlanSuggestions(tenantId: string): Promise<ActionPlanSuggestionWithTasks[]> {
  return findPendingActionPlanSuggestions(tenantId)
}
