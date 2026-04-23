"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { dismissActionPlanSuggestion } from "@/modules/action-plans/action-plan-suggestion.service"
import type { ActionResult } from "@/libs/utils/action-result"

export async function dismissActionPlanSuggestionAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) redirect("/login")

  if (typeof id !== "string" || id.trim().length === 0) {
    return { error: "ID inválido." }
  }

  await dismissActionPlanSuggestion(session.tenantId, id.trim(), session.userId)
  revalidatePath("/action-plans")
  return {}
}
