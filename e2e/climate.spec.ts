import { expect, test } from "@playwright/test"
import { gotoAndSettle, trackConsoleErrors } from "./helpers"

const CLIMATE_DASHBOARD = "/climate-surveys"

test.describe("Pesquisa de Clima", () => {
  test("o painel exibe os blocos de leitura da onda", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, CLIMATE_DASHBOARD)
    await expect(page.getByText("Radar por tópico vs meta").first()).toBeVisible()
    await expect(page.getByText("Favorabilidade por tópico").first()).toBeVisible()
    await expect(page.getByText("Mapa de calor tópicos × departamentos").first()).toBeVisible()
    await expect(page.getByText("Evolução entre ondas").first()).toBeVisible()
  })

  test("o filtro por departamento restringe a leitura", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, CLIMATE_DASHBOARD)
    const select = page.locator("select").first()
    await select.selectOption({ label: "Operações" })
    await page.waitForTimeout(2500)
    expect(page.url()).toContain("department=")
    await expect(page.getByRole("link", { name: "Remover filtro de área" }).first()).toBeVisible()
  })

  test("a configuração de anonimato abre, salva e valida o intervalo", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, CLIMATE_DASHBOARD)
    await page.getByRole("button", { name: "Configurações" }).first().click()
    await expect(page.getByText("Configurações de exibição").first()).toBeVisible()

    const input = page.locator('input[type="number"]').first()
    await input.fill("45")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Configuração salva.").first()).toBeVisible({ timeout: 15000 })

    await page.getByRole("button", { name: "Configurações" }).first().click()
    const inputAgain = page.locator('input[type="number"]').first()
    await inputAgain.fill("40")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Configuração salva.").first()).toBeVisible({ timeout: 15000 })
  })

  test("o gerenciador de tópicos cria um tópico novo", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/configure/new")
    await page.getByRole("button", { name: /Gerenciar t/ }).first().click()
    const newTopicInput = page.getByLabel("Nome do novo tópico")
    await expect(newTopicInput).toBeVisible({ timeout: 15000 })

    const topicName = `Segurança Psicológica ${Date.now()}`
    await newTopicInput.fill(topicName)
    await page.getByRole("button", { name: "Adicionar" }).click()
    await expect(page.getByText(topicName).first()).toBeVisible({ timeout: 15000 })
  })

  test("o banco de perguntas mostra tópicos, escala e importação", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/configure/new")
    await expect(page.getByText(/Adicionar pergunta personalizada/i).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Importar de arquivo/i }).first()).toBeVisible()
    await expect(page.getByText(/Escala e pesos/i).first()).toBeVisible()
  })

  test("o formulário de nova pesquisa reúne identificação, setores e envio", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/configure/new")
    await expect(page.getByText("Identificação").first()).toBeVisible()
    await expect(page.getByText("Setores").first()).toBeVisible()
    await expect(page.getByText("Frequência").first()).toBeVisible()
    await expect(page.getByText("Nome da pesquisa").first()).toBeVisible()
  })

  test("a tela de disparo exibe canais, anonimato e recorrência", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/dispatches")
    await expect(page.getByText("Canais").first()).toBeVisible()
    await expect(page.getByText("WhatsApp").first()).toBeVisible()
    await expect(page.getByText("Anonimato").first()).toBeVisible()
    await expect(page.getByText("Recorrência").first()).toBeVisible()
    await expect(page.getByText("Resumo").first()).toBeVisible()
    await expect(page.getByText("Destinatários").first()).toBeVisible()
  })

  test("a adesão compara os canais e lista os setores", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/adherence")
    await expect(page.getByText("Adesão geral").first()).toBeVisible()
    await expect(page.getByText("Canais").first()).toBeVisible()
    await expect(page.getByText("Colaboradores").first()).toBeVisible()
    await expect(page.getByText("Status").first()).toBeVisible()
  })

  test("o comparativo entre ondas exibe tópicos, variação e leitura", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/compare")
    await expect(page.getByText("Comparativo entre ondas").first()).toBeVisible()
    await expect(page.getByText("Tópico").first()).toBeVisible()
    await expect(page.getByText("Variação").first()).toBeVisible()
    await expect(page.getByText("Leitura").first()).toBeVisible()
  })

  test("o banco de relatórios lista as ondas com ações", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/reports")
    await expect(page.getByText("Banco de relatórios").first()).toBeVisible()
    await expect(page.getByText(/Onda/).first()).toBeVisible({ timeout: 15000 })
  })

  test("os planos de ação exibem sugestões e cartões", async ({ page }): Promise<void> => {
    await gotoAndSettle(page, "/climate-surveys/action-plans")
    await expect(page.getByText("Sugerido pelo sistema").first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: "Recusar", exact: true }).first()).toBeVisible()
  })

  test("a navegação pelas telas de clima não gera erros de console", async ({ page }): Promise<void> => {
    const errors = trackConsoleErrors(page)
    await gotoAndSettle(page, CLIMATE_DASHBOARD)
    await gotoAndSettle(page, "/climate-surveys/compare")
    await gotoAndSettle(page, "/climate-surveys/reports")
    expect(errors).toEqual([])
  })
})
