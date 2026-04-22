"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { publishNewConsentTermVersion } from "@/modules/consent/consent.service"

export async function createConsentTermVersionAction(input: {
  version: string
  content: string
}): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession()
    if (!session) return { error: "Acesso não autorizado." }

    await publishNewConsentTermVersion(input)

    revalidatePath("/super-admin/consent-terms")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
