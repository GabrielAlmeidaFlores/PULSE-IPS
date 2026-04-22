"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createNewTermsVersion } from "@/modules/terms/terms.service"

const createTermsSchema = z.object({
  version: z.string().min(1).max(20).trim(),
  title: z.string().min(1).max(255).trim(),
  content: z.string().min(1).max(500000),
  effectiveAt: z.string().datetime(),
})

export async function createTermsVersionAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession()
    if (!session) return { error: "Acesso não autorizado." }

    const parsed = createTermsSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

    await createNewTermsVersion({
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
