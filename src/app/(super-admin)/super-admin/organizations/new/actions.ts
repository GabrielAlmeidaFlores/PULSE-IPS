"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createOrg } from "@/modules/organizations/organization.service"
import { sendInvite } from "@/modules/auth/invite.service"
import { createOrgByAdminSchema } from "@/modules/organizations/organization.schema"
import type { ActionResult } from "@/libs/utils/action-result"
import { AppError } from "@/libs/errors/app-error"

export async function createOrgByAdminAction(input: unknown): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")

  const parsed = createOrgByAdminSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    const org = await createOrg({
      name: parsed.data.name,
      slug: parsed.data.slug,
      ...(parsed.data.planId !== undefined ? { planId: parsed.data.planId } : {}),
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
    })

    await sendInvite(org.id, parsed.data.adminEmail, "admin")
    revalidatePath("/super-admin/organizations")
    redirect(`/super-admin/organizations/${org.id}`)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
