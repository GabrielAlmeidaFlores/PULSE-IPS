import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/libs/logger"
import { checkRateLimit, getClientIp } from "@/libs/rate-limit"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = await getClientIp()
  const rateLimitResult = await checkRateLimit(`csp-report:${ip}`, 20, 60)
  if (!rateLimitResult.allowed) {
    return new NextResponse(null, { status: 429 })
  }

  try {
    const body: unknown = await request.json()
    logger.warn({ cspReport: body }, "CSP violation reported")
  } catch {
    logger.warn("CSP violation reported (unparseable body)")
  }
  return new NextResponse(null, { status: 204 })
}
