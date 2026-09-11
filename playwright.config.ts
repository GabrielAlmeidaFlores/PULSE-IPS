import { defineConfig } from "@playwright/test"

const AUTH_FILE = "e2e/.auth/user.json"

export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "authenticated",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: { storageState: AUTH_FILE },
    },
  ],
})
