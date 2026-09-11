import { expect, test, type Page } from "@playwright/test"
import { expectNoHorizontalOverflow, gotoAndSettle, trackConsoleErrors } from "./helpers"

const ROUTES = [
  "/dashboard",
  "/governance",
  "/climate-surveys",
  "/climate-surveys/adherence",
  "/climate-surveys/compare",
  "/climate-surveys/reports",
  "/climate-surveys/action-plans",
  "/climate-surveys/configure",
  "/climate-surveys/configure/new",
  "/climate-surveys/dispatches",
  "/workforce",
  "/workforce/import",
  "/workforce/insights",
]

function countUnnamedButtons(page: Page): Promise<number> {
  return page.evaluate((): number => {
    const buttons = Array.from(document.querySelectorAll("button"))
    return buttons.filter((element) => {
      const text = (element.textContent ?? "").trim()
      const aria = element.getAttribute("aria-label") ?? ""
      const title = element.getAttribute("title") ?? ""
      return text.length === 0 && aria.length === 0 && title.length === 0
    }).length
  })
}

test.describe("Consistência das telas", () => {
  test("nenhuma tela apresenta rolagem horizontal indevida", async ({ page }): Promise<void> => {
    for (const route of ROUTES) {
      await gotoAndSettle(page, route)
      await expectNoHorizontalOverflow(page)
    }
  })

  test("nenhuma tela gera erro de console", async ({ page }): Promise<void> => {
    const errors = trackConsoleErrors(page)
    for (const route of ROUTES) {
      await gotoAndSettle(page, route)
    }
    expect(errors).toEqual([])
  })

  test("todos os botões possuem nome acessível", async ({ page }): Promise<void> => {
    const offenders: string[] = []
    for (const route of ROUTES) {
      await gotoAndSettle(page, route)
      const count = await countUnnamedButtons(page)
      if (count > 0) offenders.push(`${route}: ${count}`)
    }
    expect(offenders).toEqual([])
  })

  test("cada tela exibe um título principal", async ({ page }): Promise<void> => {
    const missing: string[] = []
    for (const route of ROUTES) {
      await gotoAndSettle(page, route)
      const headings = await page.locator("h1").count()
      if (headings === 0) missing.push(route)
    }
    expect(missing).toEqual([])
  })

  test("as telas principais não estouram na largura de celular", async ({ page }): Promise<void> => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const route of ROUTES) {
      await gotoAndSettle(page, route)
      await expectNoHorizontalOverflow(page)
    }
  })
})
