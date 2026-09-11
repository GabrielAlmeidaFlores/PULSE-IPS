import { expect, type Page } from "@playwright/test"

export const CREDENTIALS = {
  slug: "demo",
  email: "admin@demo.com",
  password: "Testando123!",
}

function isInfrastructureNoise(text: string): boolean {
  return text.includes("Content Security Policy") || text.includes("status of 429")
}

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && !isInfrastructureNoise(message.text())) errors.push(message.text())
  })
  page.on("pageerror", (error) => {
    if (!isInfrastructureNoise(error.message)) errors.push(error.message)
  })
  return errors
}

export async function gotoAndSettle(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(1800)
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate((): number => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth
  })
  expect(overflow, "rolagem horizontal indevida").toBeLessThanOrEqual(2)
}

export async function expectTextVisible(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 })
}
