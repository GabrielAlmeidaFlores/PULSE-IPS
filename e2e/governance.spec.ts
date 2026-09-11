import { expect, test } from "@playwright/test"
import { gotoAndSettle } from "./helpers"

test.describe("Governança", () => {
  test("o painel reúne os cinco blocos macro", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/governance")
    await expect(page.getByText("Governança").first()).toBeVisible()
    await expect(page.getByText("Clima organizacional").first()).toBeVisible()
    await expect(page.getByText("Riscos e alertas").first()).toBeVisible()
    await expect(page.getByText("Planos de ação").first()).toBeVisible()
    await expect(page.getByText("Métricas de equipe").first()).toBeVisible()
    await expect(page.getByText("Roadmap de pesquisas de clima").first()).toBeVisible()
  })

  test("o painel exibe indicadores de clima, alertas e planos", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/governance")
    await expect(page.getByText("Taxa de conclusão").first()).toBeVisible()
    await expect(page.getByText("Alertas abertos").first()).toBeVisible()
    await expect(page.getByText("Índice de clima").first()).toBeVisible()
    await expect(page.getByText("eNPS").first()).toBeVisible()
  })

  test("o roadmap lista as ondas com status", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/governance")
    await expect(page.getByText("Pesquisa").first()).toBeVisible()
    await expect(page.getByText("Agendada para").first()).toBeVisible()
    await expect(page.getByText("Status").first()).toBeVisible()
  })
})
