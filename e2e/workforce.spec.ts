import { expect, test } from "@playwright/test"
import { gotoAndSettle } from "./helpers"

test.describe("Métricas de Equipe", () => {
  test("os indicadores são exibidos por competência e setor", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/workforce")
    await expect(page.getByText("Colaboradores").first()).toBeVisible()
    await expect(page.getByText("Admissões").first()).toBeVisible()
    await expect(page.getByText("Desligamentos").first()).toBeVisible()
    await expect(page.getByText("Rotatividade").first()).toBeVisible()
    await expect(page.getByText("Absenteísmo").first()).toBeVisible()
    await expect(page.getByText("Setor").first()).toBeVisible()
  })

  test("o filtro de competência atualiza a leitura", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/workforce")
    const select = page.locator("select").first()
    const options = await select.locator("option").all()
    expect(options.length).toBeGreaterThan(1)
    const secondValue = await options[1]?.getAttribute("value")
    if (secondValue !== null && secondValue !== undefined) {
      await select.selectOption(secondValue)
      await page.waitForTimeout(2500)
      expect(page.url()).toContain("competencia=")
    }
  })

  test("a importação mostra o formulário e o histórico de lotes", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/workforce/import")
    await expect(page.getByText("Importar dados").first()).toBeVisible()
    await expect(page.getByText("Arquivo", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Competência").first()).toBeVisible()
    await expect(page.getByText("Status").first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Importar arquivo" })).toBeVisible()
  })

  test("a análise com IA mostra a matriz de risco e os insights", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/workforce/insights")
    await expect(page.getByText("Análise de Equipe com IA").first()).toBeVisible()
    await expect(page.getByText("Risco").first()).toBeVisible()
    await expect(page.getByText("Clima").first()).toBeVisible()
    await expect(page.getByText("Colaboradores").first()).toBeVisible()
  })

  test("a análise permite gerar novamente com IA", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/workforce/insights")
    const button = page.getByRole("button", { name: /Gerar análise com IA|Analisando/ }).first()
    await expect(button).toBeVisible()
  })
})
