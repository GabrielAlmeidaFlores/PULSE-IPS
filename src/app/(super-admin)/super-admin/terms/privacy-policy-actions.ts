"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createNewPrivacyPolicyVersion } from "@/modules/privacy-policy/privacy-policy.service"
import { createPrivacyPolicyVersionSchema } from "@/modules/privacy-policy/privacy-policy.schema"

export async function createPrivacyPolicyVersionAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession()
    if (!session) return { error: "Acesso não autorizado." }

    const parsed = createPrivacyPolicyVersionSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

    await createNewPrivacyPolicyVersion({
      version: parsed.data.version,
      title: parsed.data.title,
      content: parsed.data.content,
      effectiveAt: new Date(parsed.data.effectiveAt),
    })

    revalidatePath("/super-admin/terms")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
