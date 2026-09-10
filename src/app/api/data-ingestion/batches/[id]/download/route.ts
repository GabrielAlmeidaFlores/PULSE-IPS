import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/modules/auth/session"
import { getDataIngestionBatchFile } from "@/modules/data-ingestion/data-ingestion.service"

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const parsedId = z.string().uuid().safeParse((await context.params).id)
  if (!parsedId.success) {
    return NextResponse.json({ error: "Lote inválido." }, { status: 400 })
  }

  const file = await getDataIngestionBatchFile(session.tenantId, parsedId.data)
  if (file === null) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 })
  }

  const extension = file.fileName.split(".").pop()?.toLowerCase() ?? ""
  const contentType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream"

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    },
  })
}
