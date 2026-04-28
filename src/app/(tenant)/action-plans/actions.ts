"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { dismissActionPlanSuggestion } from "@/modules/action-plans/action-plan-suggestion.service"
import type { ActionResult } from "@/libs/utils/action-result"

const uuidSchema = z.string().uuid()

export async function dismissActionPlanSuggestionAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) redirect("/login")

  const hasFeature = await hasTenantPlanFeature(session.tenantId, "action_plans")
  if (!hasFeature) return { error: "Plano de ação não está disponível no seu plano atual." }

  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { error: "ID inválido." }

  await dismissActionPlanSuggestion(session.tenantId, parsed.data, session.userId)
  revalidatePath("/action-plans")
  return {}
}
