import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import { env } from "@/env";

const { version: appVersion } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
) as { version: string };

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://graph.facebook.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
];

const securityHeadersDisabled = env.DISABLE_SECURITY_HEADERS;

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  headers(): Promise<
    { source: string; headers: { key: string; value: string }[] }[]
  > {
    if (securityHeadersDisabled) return Promise.resolve([]);
    return Promise.resolve([{ source: "/(.*)", headers: SECURITY_HEADERS }]);
  },
};

export default nextConfig;
