"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { formatInTimeZone } from "date-fns-tz"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { createPlan } from "@/modules/action-plans/action-plan.service"
import { getClimateSurveyDispatchDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { getOrganization } from "@/modules/organizations/organization.service"

export async function createClimateSurveyActionPlanAction(
  dispatchId: string,
): Promise<ActionResult & { planId?: string }> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedDispatchId = z.string().uuid().safeParse(dispatchId)
  if (!parsedDispatchId.success) return { error: "Disparo inválido." }

  const hasActionPlans = await hasTenantPlanFeature(session.tenantId, "action_plans")
  if (!hasActionPlans) {
    return { error: "Plano de ação não está disponível no seu plano atual." }
  }

  const hasClimateSurveys = await hasTenantPlanFeature(session.tenantId, "climate_surveys")
  if (!hasClimateSurveys) {
    return { error: "Pesquisa de clima não está disponível no seu plano atual." }
  }

  try {
    const [dashboard, org] = await Promise.all([
      getClimateSurveyDispatchDashboard(session.tenantId, parsedDispatchId.data),
      getOrganization(session.tenantId),
    ])
    if (!dashboard) return { error: "Disparo não encontrado." }

    const timezone = org?.timezone ?? "America/Sao_Paulo"
    const dateLabel = formatInTimeZone(new Date(dashboard.scheduledAt), timezone, "dd/MM/yyyy")
    const deptLabel = dashboard.departments.map((d) => d.name).join(", ")
    const titleParts = ["Plano de ação — pesquisa de clima", dashboard.configName, dateLabel]
    if (deptLabel.length > 0) titleParts.push(deptLabel)
    const title = titleParts.join(" · ").slice(0, 255)

    const plan = await createPlan(
      session.tenantId,
      {
        title,
        description: `Plano gerado a partir do disparo de pesquisa de clima "${dashboard.configName}" em ${dateLabel}.`,
        priority: "medium",
        climateSurveyDispatchId: parsedDispatchId.data,
      },
      session.userId,
    )

    revalidatePath("/action-plans")
    revalidatePath("/climate-surveys/action-plans")
    revalidatePath(`/climate-surveys/${parsedDispatchId.data}`)
    return { planId: plan.id }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
