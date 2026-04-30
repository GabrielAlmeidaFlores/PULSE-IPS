import { findSuggestionContextData } from "@/modules/action-plans/action-plan.repository"
import { pickAlertSuggestions } from "@/modules/action-plans/suggestions/alert"
import { buildReportSuggestion } from "@/modules/action-plans/suggestions/report"
import { buildDispatchSuggestion } from "@/modules/action-plans/suggestions/dispatch"
import { buildConsentSuggestion } from "@/modules/action-plans/suggestions/consent"
import { buildPgrSuggestion } from "@/modules/action-plans/suggestions/pgr"
import type { ActionPlanSuggestion } from "@/modules/action-plans/suggestions/types"

export type { ActionPlanSuggestion } from "@/modules/action-plans/suggestions/types"
export { buildAlertDescription, buildSuggestionFromAlert } from "@/modules/action-plans/suggestions/alert"
export { buildReportSuggestion } from "@/modules/action-plans/suggestions/report"
export { buildDispatchSuggestion } from "@/modules/action-plans/suggestions/dispatch"
export { buildConsentSuggestion } from "@/modules/action-plans/suggestions/consent"
export { buildPgrSuggestion } from "@/modules/action-plans/suggestions/pgr"

function appendIfSlotAvailable(
  suggestions: ActionPlanSuggestion[],
  candidate: ActionPlanSuggestion | null,
): void {
  if (candidate !== null && suggestions.length < 3) {
    suggestions.push(candidate)
  }
}

export async function computeRawSuggestions(tenantId: string): Promise<ActionPlanSuggestion[]> {
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  const ctx = await findSuggestionContextData(tenantId)

  const lowAdherenceDispatches = ctx.recentDispatches.filter(
    (d) => d.totalRecipients > 0 && d.totalResponses / d.totalRecipients < 0.8,
  )

  const existingTitles = new Set(ctx.recentPlanTitles.map((p: { title: string }) => p.title.toLowerCase()))
  const seenKeys = new Set<string>()
  const suggestions: ActionPlanSuggestion[] = []

  suggestions.push(...pickAlertSuggestions(ctx.openAlerts, existingTitles, seenKeys, 6))
  appendIfSlotAvailable(suggestions, buildReportSuggestion(ctx.openReports, existingTitles))
  appendIfSlotAvailable(suggestions, buildDispatchSuggestion(lowAdherenceDispatches, existingTitles))
  appendIfSlotAvailable(suggestions, buildConsentSuggestion(ctx.consentPendingByDept, ctx.deptNamesById, existingTitles))
  appendIfSlotAvailable(suggestions, buildPgrSuggestion(ctx.lastPgrReview, thisMonthStart, existingTitles))

  return suggestions
}
