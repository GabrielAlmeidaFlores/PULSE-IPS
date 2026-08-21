"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { launchClimateSurveyCampaign } from "@/modules/climate-surveys/climate-survey-campaign.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const launchClimateSurveyCampaignSchema = z.object({
  configId: z.string().uuid(),
  sendViaMessaging: z.boolean(),
  sendViaSignedLink: z.boolean(),
  frequency: z.enum(["once", "quarterly", "semiannual", "daily", "twice_weekly", "weekly", "biweekly", "monthly"]),
  timingMode: z.enum(["now", "schedule", "reminder_48h"]),
  scheduledAt: z.string().datetime(),
  departmentIds: z.array(z.string().uuid()).min(1),
})

interface LaunchClimateSurveyCampaignResult extends ActionResult {
  dispatchId?: string
}

export async function launchClimateSurveyCampaignAction(
  input: unknown,
): Promise<LaunchClimateSurveyCampaignResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) {
    return { error: "Recurso não disponível no plano." }
  }

  const parsed = launchClimateSurveyCampaignSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    const result = await launchClimateSurveyCampaign(session.tenantId, {
      configId: parsed.data.configId,
      sendViaMessaging: parsed.data.sendViaMessaging,
      sendViaSignedLink: parsed.data.sendViaSignedLink,
      frequency: parsed.data.frequency,
      timingMode: parsed.data.timingMode,
      scheduledAt: new Date(parsed.data.scheduledAt),
      departmentIds: parsed.data.departmentIds,
    })
    revalidatePath("/climate-surveys/dispatches")
    revalidatePath("/climate-surveys")
    revalidatePath("/climate-surveys/configure")
    return { dispatchId: result.dispatchId }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
