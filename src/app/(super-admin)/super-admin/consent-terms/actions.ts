"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { publishNewConsentTermVersion } from "@/modules/consent/consent.service"

const createConsentTermSchema = z.object({
  version: z.string().min(1).max(20).trim(),
  content: z.string().min(1).max(500000),
})

export async function createConsentTermVersionAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession()
    if (!session) return { error: "Acesso não autorizado." }

    const parsed = createConsentTermSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

    await publishNewConsentTermVersion(parsed.data)

    revalidatePath("/super-admin/consent-terms")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
