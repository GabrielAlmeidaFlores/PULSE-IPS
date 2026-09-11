import { test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

const SHOTS = "e2e/__screenshots__"

interface Screen {
  path: string
  name: string
}

const SCREENS: Screen[] = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/governance", name: "governance" },
  { path: "/climate-surveys", name: "climate-dashboard" },
  { path: "/climate-surveys/adherence", name: "climate-adherence" },
  { path: "/climate-surveys/compare", name: "climate-compare" },
  { path: "/climate-surveys/reports", name: "climate-reports" },
  { path: "/climate-surveys/action-plans", name: "climate-action-plans" },
  { path: "/climate-surveys/configure", name: "climate-configure" },
  { path: "/climate-surveys/configure/new", name: "climate-configure-new" },
  { path: "/climate-surveys/dispatches", name: "climate-dispatches" },
  { path: "/workforce", name: "workforce" },
  { path: "/workforce/import", name: "workforce-import" },
  { path: "/workforce/insights", name: "workforce-insights" },
]

async function capture(page: Page, name: string): Promise<void> {
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

test.beforeAll((): void => {
  mkdirSync(SHOTS, { recursive: true })
})

test("captura as telas principais do painel", async ({ page }): Promise<void> => {
  let index = 2
  for (const screen of SCREENS) {
    await page.goto(screen.path)
    const prefix = String(index).padStart(2, "0")
    await capture(page, `${prefix}-${screen.name}`)
    index += 1
  }

  await page.goto("/climate-surveys")
  await page.waitForTimeout(2000)
  const settingsButton = page.getByRole("button", { name: /Configura/ }).first()
  if (await settingsButton.count()) {
    await settingsButton.click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SHOTS}/20-climate-settings-modal.png`, fullPage: true })
    await page.keyboard.press("Escape")
  }

  await page.goto("/climate-surveys/configure/new")
  await page.waitForTimeout(2000)
  const topicsButton = page.getByRole("button", { name: /Gerenciar t/ }).first()
  if (await topicsButton.count()) {
    await topicsButton.click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SHOTS}/21-climate-topics-modal.png`, fullPage: true })
    await page.keyboard.press("Escape")
  }
})
