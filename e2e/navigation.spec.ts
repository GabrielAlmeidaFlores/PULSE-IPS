import { expect, test } from "@playwright/test"
import { gotoAndSettle } from "./helpers"

test.describe("Organização da plataforma", () => {
  test("a barra lateral organiza a navegação por módulos", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/dashboard")
    const nav = page.locator("aside").first()
    await expect(nav.getByRole("link", { name: "Clima", exact: true })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Métricas de Equipe", exact: true })).toBeVisible()
    await expect(nav.getByRole("link", { name: "PGR", exact: true })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Governança" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Painel", exact: true })).toBeVisible()
  })

  test("o seletor troca os itens exibidos conforme o módulo", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/dashboard")
    const nav = page.locator("aside").first()
    await nav.getByRole("link", { name: "Métricas de Equipe", exact: true }).click()
    await page.waitForURL("**/workforce", { timeout: 30000 })
    await expect(nav.getByRole("link", { name: "Importar dados" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Análise com IA" })).toBeVisible()

    await nav.getByRole("link", { name: "Clima", exact: true }).click()
    await page.waitForURL("**/climate-surveys", { timeout: 30000 })
    await expect(nav.getByRole("link", { name: "Comparar ondas" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Relatórios" })).toBeVisible()
  })

  test("o cabeçalho exibe a empresa, o documento e o plano", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/dashboard")
    await expect(page.getByText("Grupo Meridiano").first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("48.221.507/0001-63").first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Professional/).first()).toBeVisible({ timeout: 15000 })
  })

  test("as telas gerais continuam acessíveis", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/employees")
    await expect(page.getByText("Grupo Meridiano").first()).toBeVisible()
    await gotoAndSettle(page, "/alerts")
    await expect(page.locator("body")).toBeVisible()
  })

  test("o grupo Geral dá acesso às pesquisas de saúde", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/dashboard")
    const nav = page.locator("aside").first()
    const link = nav.getByRole("link", { name: "Pesquisas de Saúde" })
    await expect(link).toBeVisible()
    await expect(nav.getByRole("link", { name: "Configurar pesquisas" })).toHaveCount(0)

    await link.click()
    await page.waitForURL("**/health-surveys", { timeout: 30000 })
    await expect(page.getByRole("heading", { name: "Pesquisas", exact: true })).toBeVisible()

    await gotoAndSettle(page, "/health-surveys/configure")
    await expect(page.getByRole("heading", { name: "Configurar Pesquisas" })).toBeVisible()
  })
})
