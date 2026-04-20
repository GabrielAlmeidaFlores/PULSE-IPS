import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/modules/auth/session"
import { getDocumentVersionForDownload } from "@/modules/documents/document.service"

interface Params {
  id: string
  versionId: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { id, versionId } = await params

  const version = await getDocumentVersionForDownload(session.tenantId, id, versionId)

  if (!version) return new NextResponse("Not found", { status: 404 })

  const { getStorageService } = await import("@/libs/integrations")
  const storage = getStorageService()
  const signedUrl = await storage.getUrl(version.fileUrl)

  return NextResponse.redirect(signedUrl)
}
