import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { requestLogService } from "@/modules/request-logs/request-log.service"

const insertLogSchema = z.object({
  method: z.string(),
  path: z.string(),
  query: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  requestHeaders: z.record(z.string(), z.string()),
  requestBody: z.record(z.string(), z.unknown()).optional(),
  responseStatus: z.number().int().optional(),
  responseHeaders: z.record(z.string(), z.string()).optional(),
  responseBody: z.record(z.string(), z.unknown()).optional(),
  durationMs: z.number().int().optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  userType: z.string().optional(),
  isRedirect: z.boolean().optional(),
  redirectTo: z.string().optional(),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get("x-internal-secret")
  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = insertLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  await requestLogService.insertLog(parsed.data)
  return NextResponse.json({ ok: true })
}
