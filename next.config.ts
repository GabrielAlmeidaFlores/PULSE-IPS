import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import { env } from "@/env";

const { version: appVersion } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
) as { version: string };

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), idle-detection=(), browsing-topics=(), interest-cohort=(), attribution-reporting=(), screen-wake-lock=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const securityHeadersDisabled = env.DISABLE_SECURITY_HEADERS;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
    proxyClientMaxBodySize: "2gb",
  },
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
