import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { checkRateLimit } from "@/libs/rate-limit"

const rateLimitCheckSchema = z.object({
  key: z.string().min(1).max(200),
  limit: z.number().int().positive(),
  windowSeconds: z.number().int().positive(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get("x-internal-secret")
  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = rateLimitCheckSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const result = await checkRateLimit(parsed.data.key, parsed.data.limit, parsed.data.windowSeconds)
  return NextResponse.json(result)
}
