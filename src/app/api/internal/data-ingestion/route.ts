import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { runDataIngestionWithAI } from "@/modules/data-ingestion/data-ingestion.service"

const runDataIngestionSchema = z.object({
  tenantId: z.string().uuid(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, "Competência deve estar no formato AAAA-MM."),
  fileName: z.string().trim().min(1),
  fileType: z.string().trim().min(1),
  sourceText: z.string().min(1),
})

export async function POST(request: Request): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = runDataIngestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
  }

  try {
    const result = await runDataIngestionWithAI(parsed.data.tenantId, {
      competencia: parsed.data.competencia,
      fileName: parsed.data.fileName,
      fileType: parsed.data.fileType,
      sourceText: parsed.data.sourceText,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
