import { NextResponse } from "next/server"
import { logger } from "@/libs/logger"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json()
    logger.warn({ cspReport: body }, "CSP violation reported")
  } catch {
    logger.warn("CSP violation reported (unparseable body)")
  }
  return new NextResponse(null, { status: 204 })
}
