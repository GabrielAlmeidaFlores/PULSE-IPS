import { NextResponse } from "next/server"
import { env } from "@/env"
import { getStorageService } from "@/libs/integrations"

interface Params {
  key: string[]
}

function resolveContentType(key: string): string {
  if (key.endsWith(".pdf")) return "application/pdf"
  if (key.endsWith(".csv")) return "text/csv; charset=utf-8"
  if (key.endsWith(".txt")) return "text/plain; charset=utf-8"
  if (key.endsWith(".png")) return "image/png"
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}

export async function GET(_request: Request, { params }: { params: Promise<Params> }): Promise<NextResponse> {
  if (env.STORAGE_PROVIDER !== "console") {
    return new NextResponse("Not found", { status: 404 })
  }

  const { key } = await params
  const storageKey = key.join("/")
  if (storageKey.length === 0) return new NextResponse("Not found", { status: 404 })

  try {
    const storage = getStorageService()
    const buffer = await storage.download(storageKey)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": resolveContentType(storageKey),
        "content-disposition": `inline; filename="${storageKey.split("/").pop() ?? "documento"}"`,
        "cache-control": "private, max-age=60",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
