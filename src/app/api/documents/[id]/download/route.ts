import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/modules/auth/session"
import { getDocument } from "@/modules/documents/document.service"

interface Params {
  id: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { id } = await params
  const doc = await getDocument(session.tenantId, id)

  if (!doc) return new NextResponse("Not found", { status: 404 })

  const fileKey = doc.versions[0]?.fileUrl ?? doc.fileUrl
  if (!fileKey) return new NextResponse("No file attached", { status: 404 })

  const { getStorageService } = await import("@/libs/integrations")
  const storage = getStorageService()
  const signedUrl = await storage.getUrl(fileKey)

  return NextResponse.redirect(signedUrl)
}
