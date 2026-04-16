"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createNewTermsVersion } from "@/modules/terms/terms.service"


export async function createTermsVersionAction(input: {
  version: string
  title: string
  content: string
  effectiveAt: string
}): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession()
    if (!session) return { error: "Acesso não autorizado." }

    if (!input.version.trim() || !input.title.trim() || !input.content.trim()) {
      return { error: "Preencha todos os campos obrigatórios." }
    }

    const effectiveAt = new Date(input.effectiveAt)
    if (isNaN(effectiveAt.getTime())) return { error: "Data de vigência inválida." }

    await createNewTermsVersion({
      version: input.version.trim(),
      title: input.title.trim(),
      content: input.content.trim(),
      effectiveAt,
    })

    revalidatePath("/super-admin/terms")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
