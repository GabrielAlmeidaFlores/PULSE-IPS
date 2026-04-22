import type { Instrumentation } from "next"

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
) => {
  const err = error instanceof Error ? error : new Error(String(error))

  const forwardedFor = request.headers["x-forwarded-for"]
  const ipRaw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  const ip = ipRaw?.split(",")[0]?.trim() ?? request.headers["x-real-ip"] ?? undefined

  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"

  try {
    await fetch(`${appUrl}/api/internal/request-log`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": process.env["CRON_SECRET"] ?? "",
      },
      body: JSON.stringify({
        method: request.method,
        path: request.path,
        ip,
        requestHeaders: Object.fromEntries(
          Object.entries(request.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : (v ?? "")]),
        ),
        responseStatus: 500,
        errorMessage: err.message,
        errorStack: err.stack,
      }),
    })
  } catch {
  }
}
