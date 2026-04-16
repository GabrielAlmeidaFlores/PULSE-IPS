"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { createNewDocument } from "@/modules/documents/document.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function createDocumentAction(input: {
  title: string
  type: "policy" | "procedure" | "pgr" | "pcmso" | "other"
  fileUrl: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!input.title.trim()) return { error: "Título é obrigatório." }
  if (!input.fileUrl.trim()) return { error: "URL do arquivo é obrigatória." }
  try {
    await createNewDocument(session.tenantId, input)
    revalidatePath("/documents")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
