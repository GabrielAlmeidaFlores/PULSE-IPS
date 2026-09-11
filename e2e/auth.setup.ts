import { test as setup } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { CREDENTIALS } from "./helpers"

const AUTH_FILE = "e2e/.auth/user.json"
const SHOTS = "e2e/__screenshots__"

setup("autenticar e capturar a tela de acesso", async ({ page }): Promise<void> => {
  mkdirSync("e2e/.auth", { recursive: true })
  mkdirSync(SHOTS, { recursive: true })

  await page.goto("/login")
  await page.fill("#orgSlug", CREDENTIALS.slug)
  await page.fill("#email", CREDENTIALS.email)
  await page.fill("#password", CREDENTIALS.password)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/01-login.png`, fullPage: true })
  await page.click('button[type="submit"]')
  await page.waitForURL("**/dashboard", { timeout: 60000 })
  await page.context().storageState({ path: AUTH_FILE })
})
