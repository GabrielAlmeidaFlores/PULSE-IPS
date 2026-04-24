import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      SKIP_ENV_VALIDATION: "true",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      NEXTAUTH_SECRET: "test-secret",
      CRON_SECRET: "test-cron",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      include: [
        "src/libs/utils/health-index.ts",
        "src/modules/alerts/alert.service.ts",
        "src/modules/consent/consent.service.ts",
        "src/modules/surveys/survey.service.ts",
        "src/modules/action-plans/action-plan-suggestions.ts",
      ],
      exclude: ["src/**/*.test.ts"],
    },
  },
})
