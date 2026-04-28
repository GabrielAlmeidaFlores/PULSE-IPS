import "dotenv/config"
import { createLogger } from "../../libs/utils/logger"

const logger = createLogger("seed")

import { createHash, randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  addWeeks,
  addDays,
  addHours,
  subMonths,
  format,
  startOfDay,
  setHours,
  setMinutes,
} from "date-fns"

function toHealthIndex(avg: number): number {
  return Math.round(((avg - 1) / 4) * 100)
}

function healthIndexLabel(hi: number): string {
  if (hi >= 62) return "Saudável"
  if (hi >= 37) return "Atenção"
  return "Crítico"
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const ORG_SLUG_OLD = "kyber-solucoes"
const ORG_SLUG_NEW = "demo"
const ORG_NAME_NEW = "Demo"
const TIMEZONE = "America/Sao_Paulo"

const ADMIN_EMAIL = "admin@demo.com"
const ADMIN_PASSWORD = "Testando123!"
const RH_EMAIL = "rh@demo.com"
const RH_PASSWORD = "Testando123!"

const NOW = new Date("2026-04-23T10:00:00Z")
const ONE_YEAR_AGO = subMonths(NOW, 12)

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, v))
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

function cpfHash(cpf: string): string {
  return createHash("sha256").update(cpf).digest("hex")
}

interface DeptProfile {
  name: string
  employeeCount: number
  frequency: "weekly" | "biweekly"
  baseScore: (weekIndex: number) => number
  adherenceRate: (weekIndex: number) => number
  workDays: number[]
}

const DEPT_PROFILES: DeptProfile[] = [
  {
    name: "Tecnologia",
    employeeCount: 8,
    frequency: "weekly",
    baseScore: (w) => {
      if (w < 16) return 4.1 + (Math.random() - 0.5) * 0.4
      if (w < 28) return 3.2 + (Math.random() - 0.5) * 0.6
      if (w < 36) return 3.6 + (Math.random() - 0.5) * 0.4
      return 3.9 + (Math.random() - 0.5) * 0.3
    },
    adherenceRate: (w) => (w >= 16 && w < 28 ? 0.65 : 0.88),
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Comercial",
    employeeCount: 7,
    frequency: "weekly",
    baseScore: (_) => 4.0 + (Math.random() - 0.5) * 0.5,
    adherenceRate: (_) => 0.9 + Math.random() * 0.1,
    workDays: [1, 2, 3, 4, 5, 6],
  },
  {
    name: "Recursos Humanos",
    employeeCount: 5,
    frequency: "biweekly",
    baseScore: (_) => 4.4 + (Math.random() - 0.5) * 0.4,
    adherenceRate: (_) => 0.92 + Math.random() * 0.08,
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Financeiro",
    employeeCount: 6,
    frequency: "weekly",
    baseScore: (w) => clamp(3.6 - w * 0.025 + (Math.random() - 0.5) * 0.4),
    adherenceRate: (w) => clamp(0.82 - w * 0.003 + (Math.random() - 0.5) * 0.1, 0.4, 0.95),
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Operações",
    employeeCount: 9,
    frequency: "weekly",
    baseScore: (w) => {
      if (w >= 18 && w < 30) return 2.1 + (Math.random() - 0.5) * 0.5
      return 2.7 + (Math.random() - 0.5) * 0.5
    },
    adherenceRate: (w) => (w >= 18 && w < 30 ? 0.55 : 0.72),
    workDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    name: "Marketing",
    employeeCount: 6,
    frequency: "biweekly",
    baseScore: (w) => {
      const cycle = Math.sin((w / 52) * Math.PI * 3)
      return clamp(3.5 + cycle * 0.8 + (Math.random() - 0.5) * 0.4)
    },
    adherenceRate: (_) => 0.75 + Math.random() * 0.2,
    workDays: [1, 2, 3, 4, 5],
  },
]

const QUESTION_BANKS: Record<string, { text: string; direction: string }[]> = {
  default: [
    { text: "Como você avalia seu nível de energia e disposição para trabalhar esta semana?", direction: "higher_is_better" },
    { text: "Você sente que sua carga de trabalho está equilibrada e gerenciável?", direction: "higher_is_better" },
    { text: "Como está a qualidade do relacionamento com sua equipe e liderança?", direction: "higher_is_better" },
    { text: "Você se sente reconhecido(a) e valorizado(a) pelo seu trabalho?", direction: "higher_is_better" },
    { text: "Qual é o seu nível de satisfação geral com o ambiente de trabalho?", direction: "higher_is_better" },
  ],
}

const DOCUMENT_TEMPLATES = [
  { title: "Programa de Gerenciamento de Riscos (PGR) — 2025", type: "pgr" },
  { title: "Manual de Segurança e Saúde Ocupacional", type: "manual" },
  { title: "Plano de Ação Corretiva — Operações Q3/2025", type: "action_plan" },
  { title: "Relatório de Incidentes — Outubro 2025", type: "report" },
  { title: "Treinamento NR-1: Riscos Psicossociais no Trabalho", type: "training" },
  { title: "Política de Bem-Estar e Saúde Mental", type: "policy" },
  { title: "Ata de Reunião CIPA — Novembro 2025", type: "meeting_minutes" },
]

const REPORT_TEMPLATES = [
  {
    content: "Estou sentindo uma pressão muito grande para entregar resultados impossíveis em prazos irreais. Isso está afetando meu sono e minha saúde.",
    category: "overload",
    status: "resolved",
  },
  {
    content: "Há um colega que faz comentários inapropriados e cria um ambiente hostil. Já aconteceu mais de uma vez.",
    category: "harassment",
    status: "analyzing",
  },
  {
    content: "As cadeiras e mesas na área de operações estão causando dores nas costas. Precisamos de ergonomia adequada.",
    category: "physical_environment",
    status: "resolved",
  },
  {
    content: "Existe um conflito sério entre dois líderes que está afetando toda a equipe. Precisamos de mediação.",
    category: "conflict",
    status: "open",
  },
  {
    content: "O volume de reuniões está completamente excessivo. Passamos mais tempo em reunião do que trabalhando.",
    category: "overload",
    status: "analyzing",
  },
  {
    content: "Me sinto muito mal com o nível de cobrança e microgerenciamento que estou sofrendo.",
    category: "other",
    status: "open",
  },
]

const EMPLOYEES_BY_DEPT: Record<string, { name: string; phone: string; email?: string }[]> = {
  Tecnologia: [
    { name: "Lucas Ferreira", phone: "+5511911110001", email: "lucas.ferreira@demo.com" },
    { name: "Ana Paula Souza", phone: "+5511911110002", email: "ana.souza@demo.com" },
    { name: "Rafael Mendes", phone: "+5511911110003", email: "rafael.mendes@demo.com" },
    { name: "Carla Nunes", phone: "+5511911110004", email: "carla.nunes@demo.com" },
    { name: "Thiago Alves", phone: "+5511911110005", email: "thiago.alves@demo.com" },
    { name: "Beatriz Lima", phone: "+5511911110006", email: "beatriz.lima@demo.com" },
    { name: "Diego Costa", phone: "+5511911110007", email: "diego.costa@demo.com" },
    { name: "Fernanda Rocha", phone: "+5511911110008", email: "fernanda.rocha@demo.com" },
  ],
  Comercial: [
    { name: "Mariana Borges", phone: "+5511911110009", email: "mariana.borges@demo.com" },
    { name: "Felipe Santos", phone: "+5511911110010", email: "felipe.santos@demo.com" },
    { name: "Juliana Melo", phone: "+5511911110011", email: "juliana.melo@demo.com" },
    { name: "André Vieira", phone: "+5511911110012", email: "andre.vieira@demo.com" },
    { name: "Patricia Carvalho", phone: "+5511911110013", email: "patricia.carvalho@demo.com" },
    { name: "Ricardo Pinto", phone: "+5511911110014", email: "ricardo.pinto@demo.com" },
    { name: "Camila Torres", phone: "+5511911110015", email: "camila.torres@demo.com" },
  ],
  "Recursos Humanos": [
    { name: "Vanessa Monteiro", phone: "+5511911110016", email: "vanessa.monteiro@demo.com" },
    { name: "Eduardo Figueiredo", phone: "+5511911110017", email: "eduardo.figueiredo@demo.com" },
    { name: "Larissa Barbosa", phone: "+5511911110018", email: "larissa.barbosa@demo.com" },
    { name: "Gustavo Leal", phone: "+5511911110019", email: "gustavo.leal@demo.com" },
    { name: "Isabela Macedo", phone: "+5511911110020", email: "isabela.macedo@demo.com" },
  ],
  Financeiro: [
    { name: "Roberto Assis", phone: "+5511911110021", email: "roberto.assis@demo.com" },
    { name: "Tatiana Corrêa", phone: "+5511911110022", email: "tatiana.correa@demo.com" },
    { name: "Alexandre Cunha", phone: "+5511911110023", email: "alexandre.cunha@demo.com" },
    { name: "Priscila Ramos", phone: "+5511911110024", email: "priscila.ramos@demo.com" },
    { name: "Bruno Cavalcante", phone: "+5511911110025", email: "bruno.cavalcante@demo.com" },
    { name: "Michele Freitas", phone: "+5511911110026", email: "michele.freitas@demo.com" },
  ],
  Operações: [
    { name: "Jonas Teixeira", phone: "+5511911110027", email: "jonas.teixeira@demo.com" },
    { name: "Simone Andrade", phone: "+5511911110028", email: "simone.andrade@demo.com" },
    { name: "Mauro Rodrigues", phone: "+5511911110029", email: "mauro.rodrigues@demo.com" },
    { name: "Cristiane Peixoto", phone: "+5511911110030", email: "cristiane.peixoto@demo.com" },
    { name: "Leandro Moura", phone: "+5511911110031", email: "leandro.moura@demo.com" },
    { name: "Aline Nascimento", phone: "+5511911110032", email: "aline.nascimento@demo.com" },
    { name: "Paulo Siqueira", phone: "+5511911110033", email: "paulo.siqueira@demo.com" },
    { name: "Renata Campos", phone: "+5511911110034", email: "renata.campos@demo.com" },
    { name: "Sérgio Batista", phone: "+5511911110035", email: "sergio.batista@demo.com" },
  ],
  Marketing: [
    { name: "Natalia Duarte", phone: "+5511911110036", email: "natalia.duarte@demo.com" },
    { name: "Hugo Marques", phone: "+5511911110037", email: "hugo.marques@demo.com" },
    { name: "Gabriela Pereira", phone: "+5511911110038", email: "gabriela.pereira@demo.com" },
    { name: "Daniel Nogueira", phone: "+5511911110039", email: "daniel.nogueira@demo.com" },
    { name: "Amanda Xavier", phone: "+5511911110040", email: "amanda.xavier@demo.com" },
    { name: "Leonardo Fonseca", phone: "+5511911110041", email: "leonardo.fonseca@demo.com" },
  ],
}

async function main(): Promise<void> {
  logger.info("🚀 Iniciando seed de demo...")

  let org = await prisma.organization.findFirst({
    where: { OR: [{ slug: ORG_SLUG_OLD }, { slug: ORG_SLUG_NEW }] },
  })

  if (!org) {
    logger.info("🏗️  Organização demo não encontrada. Criando...")
    org = await prisma.organization.create({
      data: {
        id: randomUUID(),
        slug: ORG_SLUG_NEW,
        name: ORG_NAME_NEW,
        timezone: TIMEZONE,
        billingStatus: "active",
        isActive: true,
      },
    })
    logger.info(`✅ Organização criada: ${org.name} (${org.id})`)
  }

  const tenantId = org.id
  logger.info(`✅ Org: ${org.name} (${tenantId})`)

  logger.info("🗑️  Limpando dados antigos...")
  await prisma.organization.update({ where: { id: tenantId }, data: { slug: ORG_SLUG_NEW, name: ORG_NAME_NEW } })

  await prisma.surveyResponseItem.deleteMany({ where: { surveyResponse: { tenantId } } })
  await prisma.surveyResponse.deleteMany({ where: { tenantId } })
  await prisma.surveyResponseToken.deleteMany({ where: { tenantId } })
  await prisma.surveyDispatch.deleteMany({ where: { tenantId } })
  await prisma.surveyQuestion.deleteMany({ where: { tenantId } })
  await prisma.surveyConfiguration.deleteMany({ where: { tenantId } })
  await prisma.employeeConsent.deleteMany({ where: { tenantId } })
  await prisma.employee.deleteMany({ where: { tenantId } })
  await prisma.pgrReview.deleteMany({ where: { tenantId } })
  await prisma.anonymousReport.deleteMany({ where: { tenantId } })
  await prisma.actionPlan.deleteMany({ where: { tenantId } })
  await prisma.document.deleteMany({ where: { tenantId } })
  await prisma.alert.deleteMany({ where: { tenantId } })
  await prisma.department.deleteMany({ where: { tenantId } })
  await prisma.platformTermsAcceptance.deleteMany({ where: { user: { tenantId } } })
  await prisma.auditLog.deleteMany({ where: { tenantId } })
  await prisma.messageLog.deleteMany({ where: { tenantId } })
  await prisma.organizationSubscription.deleteMany({ where: { tenantId } })
  await prisma.organizationUser.deleteMany({ where: { tenantId } })
  logger.info("✅ Dados limpos. Org renomeada para 'demo'.")

  logger.info("👤 Criando usuários...")
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const rhPasswordHash = await bcrypt.hash(RH_PASSWORD, 10)
  const consentTermVersion = await prisma.consentTermVersion.findFirst({ where: { isActive: true } })
  if (!consentTermVersion) throw new Error("Nenhuma versão de TCLE ativa encontrada.")
  const platformTermsVersion = await prisma.platformTermsVersion.findFirst({ where: { isActive: true } })
  if (!platformTermsVersion) throw new Error("Nenhuma versão de Termos da Plataforma ativa encontrada.")

  const adminUser = await prisma.organizationUser.create({
    data: {
      id: randomUUID(),
      tenantId,
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Admin Demo",
      role: "admin",
      isActive: true,
      emailVerifiedAt: ONE_YEAR_AGO,
    },
  })

  const rhUser = await prisma.organizationUser.create({
    data: {
      id: randomUUID(),
      tenantId,
      email: RH_EMAIL,
      passwordHash: rhPasswordHash,
      name: "RH Demo",
      role: "rh",
      isActive: true,
      emailVerifiedAt: ONE_YEAR_AGO,
    },
  })

  await prisma.platformTermsAcceptance.create({
    data: {
      id: randomUUID(),
      termsVersionId: platformTermsVersion.id,
      userId: adminUser.id,
      acceptedAt: ONE_YEAR_AGO,
      ipAddress: "127.0.0.1",
      userAgent: "seed/demo",
    },
  })

  logger.info(`✅ Usuários criados: ${ADMIN_EMAIL}, ${RH_EMAIL}`)

  logger.info("💳 Criando assinatura...")
  const professionalPlanPrice = await prisma.planPrice.findFirst({
    where: { externalPriceId: "price_professional_monthly", isActive: true },
    include: { plan: true },
  })
  if (!professionalPlanPrice) throw new Error("Plano Professional não encontrado. Execute yarn seed primeiro.")

  const subscriptionStart = new Date(ONE_YEAR_AGO)
  subscriptionStart.setDate(1)
  const subscriptionEnd = new Date(subscriptionStart)
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)

  await prisma.organizationSubscription.create({
    data: {
      id: randomUUID(),
      tenantId,
      planId: professionalPlanPrice.planId,
      externalSubscriptionId: `sub_demo_${tenantId.slice(0, 8)}`,
      status: "active",
      currentPeriodStart: subscriptionStart,
      currentPeriodEnd: subscriptionEnd,
      cancelAtPeriodEnd: false,
      snapshotPlanName: "Professional",
      snapshotMaxEmployees: 150,
      snapshotPriceInCents: professionalPlanPrice.priceInCents,
      snapshotInterval: "monthly",
      snapshotExternalPriceId: "price_professional_monthly",
    },
  })
  logger.info("✅ Assinatura Professional criada.")

  logger.info("🏢 Criando departamentos, colaboradores e configurações...")
  const deptMap: Record<string, string> = {}
  const employeeMap: Record<string, string[]> = {}
  const configMap: Record<string, string> = {}
  const questionMap: Record<string, string[]> = {}

  for (const profile of DEPT_PROFILES) {
    const dept = await prisma.department.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: profile.name,
        isActive: true,
        workStartTime: "09:00",
        workEndTime: "18:00",
      },
    })
    deptMap[profile.name] = dept.id

    await prisma.departmentWorkDay.createMany({
      data: profile.workDays.map((d) => ({ departmentId: dept.id, dayOfWeek: d })),
    })

    const deptEmployees = EMPLOYEES_BY_DEPT[profile.name] ?? []
    const empIds: string[] = []
    for (const emp of deptEmployees) {
      const empRecord = await prisma.employee.create({
        data: {
          id: randomUUID(),
          tenantId,
          departmentId: dept.id,
          name: emp.name,
          phone: emp.phone,
          email: emp.email ?? null,
          status: "active",
        },
      })
      empIds.push(empRecord.id)

      await prisma.employeeConsent.create({
        data: {
          id: randomUUID(),
          tenantId,
          employeeId: empRecord.id,
          consentTermVersionId: consentTermVersion.id,
          event: "invited",
          source: "system",
          token: randomUUID(),
          tokenExpiresAt: addDays(ONE_YEAR_AGO, 7),
          createdAt: ONE_YEAR_AGO,
        },
      })

      await prisma.employeeConsent.create({
        data: {
          id: randomUUID(),
          tenantId,
          employeeId: empRecord.id,
          consentTermVersionId: consentTermVersion.id,
          event: "accepted",
          source: "sms_link",
          cpfHash: cpfHash(`000.000.000-${empIds.length.toString().padStart(2, "0")}`),
          createdAt: addDays(ONE_YEAR_AGO, 1),
        },
      })
    }
    employeeMap[profile.name] = empIds

    const config = await prisma.surveyConfiguration.create({
      data: {
        id: randomUUID(),
        tenantId,
        departmentId: dept.id,
        frequency: profile.frequency === "weekly" ? "weekly" : "biweekly",
        workStartTime: "09:00",
        workEndTime: "18:00",
        isActive: true,
      },
    })
    configMap[profile.name] = config.id

    await prisma.surveyConfigWorkDay.createMany({
      data: profile.workDays.map((d) => ({ configId: config.id, dayOfWeek: d })),
    })

    const questions = QUESTION_BANKS["default"] ?? []
    const qIds: string[] = []
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi]
      if (!q) continue
      const question = await prisma.surveyQuestion.create({
        data: {
          id: randomUUID(),
          tenantId,
          surveyConfigurationId: config.id,
          text: q.text,
          order: qi + 1,
          scoreDirection: q.direction,
          isActive: true,
        },
      })
      qIds.push(question.id)
    }
    questionMap[profile.name] = qIds
  }

  logger.info("✅ Departamentos e colaboradores criados.")

  logger.info("📊 Gerando 1 ano de pesquisas em memória...")

  const TOTAL_WEEKS = 52
  const alertsToCreate: {
    id: string
    tenantId: string
    departmentId: string | null
    type: string
    severity: string
    message: string
    isRead: boolean
    resolvedAt: Date | null
    createdAt: Date
  }[] = []

  const allDispatches: {
    id: string
    tenantId: string
    surveyConfigurationId: string
    scheduledAt: Date
    dispatchedAt: Date
    adherenceCheckedAt: Date
    status: string
    totalRecipients: number
    totalResponses: number
  }[] = []
  const allTokens: {
    id: string
    tenantId: string
    dispatchId: string
    employeeId: string
    token: string
    expiresAt: Date
    usedAt: Date
    workStartTime: string
    workEndTime: string
    createdAt: Date
  }[] = []
  const allResponses: {
    id: string
    tenantId: string
    dispatchId: string
    tokenId: string
    createdAt: Date
  }[] = []
  const allItems: {
    id: string
    surveyResponseId: string
    questionId: string
    score: number
  }[] = []

  for (const profile of DEPT_PROFILES) {
    const deptId = deptMap[profile.name]
    const configId = configMap[profile.name]
    const qIds = questionMap[profile.name] ?? []
    const empIds = employeeMap[profile.name] ?? []
    if (!deptId || !configId || qIds.length === 0 || empIds.length === 0) continue

    const dispatchIntervalWeeks = profile.frequency === "weekly" ? 1 : 2
    let weekIndex = 0
    let prevAvgScore = 4.0

    while (weekIndex < TOTAL_WEEKS) {
      const dispatchDate = setMinutes(setHours(addWeeks(ONE_YEAR_AGO, weekIndex), 9), 0)
      const baseScore = profile.baseScore(weekIndex)
      const adherence = profile.adherenceRate(weekIndex)
      const respondentCount = Math.max(1, Math.round(empIds.length * adherence))
      const respondents = empIds.slice(0, respondentCount)
      const dispatchId = randomUUID()

      allDispatches.push({
        id: dispatchId,
        tenantId,
        surveyConfigurationId: configId,
        scheduledAt: dispatchDate,
        dispatchedAt: dispatchDate,
        adherenceCheckedAt: addDays(dispatchDate, 2),
        status: "sent",
        totalRecipients: empIds.length,
        totalResponses: respondents.length,
      })

      const scores: number[] = []

      for (const empId of respondents) {
        const empScore = clamp(Math.round(baseScore + (Math.random() - 0.5) * 1.2))
        scores.push(empScore)

        const tokenId = randomUUID()
        const responseId = randomUUID()
        const usedAt = addHours(dispatchDate, rand(1, 6))

        allTokens.push({
          id: tokenId,
          tenantId,
          dispatchId,
          employeeId: empId,
          token: randomUUID(),
          expiresAt: addDays(dispatchDate, 2),
          usedAt,
          workStartTime: "09:00",
          workEndTime: "18:00",
          createdAt: dispatchDate,
        })

        allResponses.push({
          id: responseId,
          tenantId,
          dispatchId,
          tokenId,
          createdAt: usedAt,
        })

        for (const qId of qIds) {
          allItems.push({
            id: randomUUID(),
            surveyResponseId: responseId,
            questionId: qId,
            score: clamp(Math.round(empScore + (Math.random() - 0.5) * 0.8)),
          })
        }
      }

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3.0

      if (adherence < 0.8 && empIds.length >= 5) {
        const pct = Math.round(adherence * 100)
        const responseCount = Math.round(empIds.length * adherence)
        if (adherence < 0.5) {
          alertsToCreate.push({
            id: randomUUID(),
            tenantId,
            departmentId: deptId,
            type: "no_response",
            severity: adherence < 0.25 ? "critical" : "warning",
            message: `Taxa de adesão: ${pct}% (${responseCount}/${empIds.length})`,
            isRead: weekIndex < TOTAL_WEEKS - 8,
            resolvedAt: weekIndex < TOTAL_WEEKS - 8 ? addDays(dispatchDate, rand(3, 10)) : null,
            createdAt: addDays(dispatchDate, 2),
          })
        } else {
          alertsToCreate.push({
            id: randomUUID(),
            tenantId,
            departmentId: deptId,
            type: "low_adherence",
            severity: "warning",
            message: `Taxa de adesão: ${pct}% (${responseCount}/${empIds.length})`,
            isRead: weekIndex < TOTAL_WEEKS - 8,
            resolvedAt: weekIndex < TOTAL_WEEKS - 8 ? addDays(dispatchDate, rand(3, 10)) : null,
            createdAt: addDays(dispatchDate, 2),
          })
        }
      }

      if (prevAvgScore - avgScore > 1.0) {
        const drop = prevAvgScore - avgScore
        const prevHi = toHealthIndex(prevAvgScore)
        const currHi = toHealthIndex(avgScore)
        alertsToCreate.push({
          id: randomUUID(),
          tenantId,
          departmentId: deptId,
          type: "score_drop",
          severity: drop > 2 ? "critical" : "warning",
          message: `Queda de ${drop.toFixed(1)} pontos no índice de saúde do setor ${profile.name}: de ${prevHi}% para ${currHi}% nas últimas 48h.`,
          isRead: weekIndex < TOTAL_WEEKS - 8,
          resolvedAt: weekIndex < TOTAL_WEEKS - 8 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      if (avgScore < 3.0 && empIds.length >= 5) {
        const hi = toHealthIndex(avgScore)
        alertsToCreate.push({
          id: randomUUID(),
          tenantId,
          departmentId: deptId,
          type: "low_score",
          severity: avgScore < 2 ? "critical" : "warning",
          message: `O índice de saúde do setor ${profile.name} está abaixo do esperado: ${hi}% (${healthIndexLabel(hi)}).`,
          isRead: weekIndex < TOTAL_WEEKS - 8,
          resolvedAt: weekIndex < TOTAL_WEEKS - 8 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      prevAvgScore = avgScore
      weekIndex += dispatchIntervalWeeks
    }

    if (profile.name === "Financeiro") {
      const latestDispatchDate = addWeeks(ONE_YEAR_AGO, TOTAL_WEEKS - 2)
      const latestHi = toHealthIndex(profile.baseScore(TOTAL_WEEKS - 2))
      alertsToCreate.push({
        id: randomUUID(),
        tenantId,
        departmentId: deptId,
        type: "negative_trend",
        severity: "warning",
        message: `O setor ${profile.name} apresenta tendência negativa por 3 períodos consecutivos abaixo da média histórica. Índice atual: ${latestHi}%.`,
        isRead: false,
        resolvedAt: null,
        createdAt: latestDispatchDate,
      })
    }

    const nextReviewDate = addDays(NOW, 30)
    if (profile.name === "Tecnologia") {
      alertsToCreate.push({
        id: randomUUID(),
        tenantId,
        departmentId: null,
        type: "pgr_review_due",
        severity: "warning",
        message: `Revisão PGR prevista para ${format(nextReviewDate, "dd/MM/yyyy")}.`,
        isRead: false,
        resolvedAt: null,
        createdAt: subMonths(nextReviewDate, 0),
      })
    }
  }

  logger.info(`📥 Inserindo ${allDispatches.length} dispatches, ${allTokens.length} tokens, ${allResponses.length} respostas, ${allItems.length} itens em batch...`)

  const BATCH = 500
  await prisma.surveyDispatch.createMany({ data: allDispatches })

  for (let i = 0; i < allTokens.length; i += BATCH) {
    await prisma.surveyResponseToken.createMany({ data: allTokens.slice(i, i + BATCH) })
  }
  for (let i = 0; i < allResponses.length; i += BATCH) {
    await prisma.surveyResponse.createMany({ data: allResponses.slice(i, i + BATCH) })
  }
  for (let i = 0; i < allItems.length; i += BATCH) {
    await prisma.surveyResponseItem.createMany({ data: allItems.slice(i, i + BATCH) })
  }

  logger.info(`✅ Pesquisas geradas. Inserindo ${alertsToCreate.length} alertas...`)
  await prisma.alert.createMany({ data: alertsToCreate })

  logger.info("📋 Criando planos de ação...")
  const tecDeptId = deptMap["Tecnologia"] ?? ""
  const finDeptId = deptMap["Financeiro"] ?? ""
  const opsDeptId = deptMap["Operações"] ?? ""
  const rhUserIdForAssign = rhUser.id

  const plan1 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Reduzir sobrecarga e melhorar engajamento — Tecnologia",
      description:
        "Score de bem-estar caiu de 4.1 para 3.2 durante Q3/2025. Identificamos sobrecarga nas sprints e falta de rituais de feedback. Este plano implementa melhorias de processo e comunicação.",
      status: "completed",
      priority: "high",
      dueDate: addDays(addWeeks(ONE_YEAR_AGO, 32), 0),
      completedAt: addWeeks(ONE_YEAR_AGO, 34),
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Implementar retrospectiva quinzenal de bem-estar", assigneeId: rhUserIdForAssign, dueDate: addWeeks(ONE_YEAR_AGO, 22), completedAt: addWeeks(ONE_YEAR_AGO, 21) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Reduzir carga de horas extras — máx. 4h/semana", assigneeId: adminUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 24), completedAt: addWeeks(ONE_YEAR_AGO, 25) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Criar canal direto de feedback com gestores", assigneeId: rhUserIdForAssign, dueDate: addWeeks(ONE_YEAR_AGO, 26), completedAt: addWeeks(ONE_YEAR_AGO, 27) },
    ],
  })

  const plan2 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Reverter tendência negativa de bem-estar — Financeiro",
      description:
        "Score do departamento Financeiro vem caindo consistentemente nos últimos 3 meses. Análise indica pressão por fechamentos e falta de reconhecimento. Intervenção urgente necessária.",
      status: "in_progress",
      priority: "high",
      dueDate: addDays(NOW, 30),
      completedAt: null,
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Realizar 1:1s individuais com toda a equipe Financeiro", assigneeId: rhUserIdForAssign, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Revisar metas e prazos de fechamento contábil", assigneeId: adminUser.id, dueDate: addDays(NOW, 14), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Implementar programa de reconhecimento mensal", assigneeId: rhUserIdForAssign, dueDate: addDays(NOW, 21), completedAt: subMonths(NOW, 0) },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Pesquisa qualitativa aprofundada com colaboradores voluntários", assigneeId: rhUserIdForAssign, dueDate: addDays(NOW, 10), completedAt: null },
    ],
  })

  const plan3 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Intervenção de emergência em bem-estar — Operações",
      description:
        "Múltiplos alertas críticos em Operações: score abaixo de 2.5, adesão às pesquisas inferior a 55%, relatos anônimos sobre sobrecarga e conflitos. Plano de intervenção emergencial.",
      status: "open",
      priority: "high",
      dueDate: addDays(NOW, 14),
      completedAt: null,
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Reunião de escuta ativa com equipe de Operações", assigneeId: adminUser.id, dueDate: addDays(NOW, 3), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Avaliação ergonômica do ambiente físico", assigneeId: rhUserIdForAssign, dueDate: addDays(NOW, 5), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Revisão da escala de turnos e banco de horas", assigneeId: adminUser.id, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Processo de mediação para conflitos identificados", assigneeId: rhUserIdForAssign, dueDate: addDays(NOW, 10), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Check-in semanal presencial com liderança do setor", assigneeId: adminUser.id, dueDate: addDays(NOW, 14), completedAt: null },
    ],
  })

  logger.info("✅ Planos de ação criados.")

  logger.info("💡 Criando sugestões de planos de ação...")

  const finDeptIdForSuggestion = deptMap["Financeiro"] ?? ""
  const opsDeptIdForSuggestion = deptMap["Operações"] ?? ""
  const tecDeptIdForSuggestionBlock = deptMap["Tecnologia"] ?? ""

  const suggestion1 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(),
      tenantId,
      suggestionKey: `alert-negative_trend-${finDeptIdForSuggestion}`,
      title: `Plano de melhoria contínua — Financeiro`,
      description: `Alerta gerado — setor: Financeiro, severidade: atenção. O setor Financeiro apresenta tendência negativa por 3 períodos consecutivos abaixo da média histórica. Tendências negativas prolongadas aumentam o risco de burnout e comprometem o cumprimento da NR-1. O problema se agrava a cada ciclo sem intervenção.`,
      priority: "high",
      reason: `Tendência negativa no setor Financeiro — ativo há poucos dias`,
      status: "pending",
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: suggestion1.id, title: "Análise detalhada das respostas dos últimos períodos", sortOrder: 0 },
      { id: randomUUID(), suggestionId: suggestion1.id, title: "Reunião com liderança para identificar causas raiz", sortOrder: 1 },
      { id: randomUUID(), suggestionId: suggestion1.id, title: "Definir metas de melhoria e prazo de reavaliação", sortOrder: 2 },
      { id: randomUUID(), suggestionId: suggestion1.id, title: "Revisão do processo de trabalho no setor", sortOrder: 3 },
    ],
  })

  const suggestion2 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(),
      tenantId,
      suggestionKey: `alert-low_adherence-${opsDeptIdForSuggestion}`,
      title: `Engajamento nas pesquisas — Operações`,
      description: `Alerta gerado — setor: Operações, severidade: atenção. Taxa de adesão abaixo da meta de 80%. Baixa participação compromete a representatividade dos dados e pode mascarar problemas reais de saúde no time.`,
      priority: "medium",
      reason: `Baixa adesão no setor Operações`,
      status: "pending",
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: suggestion2.id, title: "Comunicado interno sobre a importância das pesquisas", sortOrder: 0 },
      { id: randomUUID(), suggestionId: suggestion2.id, title: "Alinhamento com gestores e lideranças do setor", sortOrder: 1 },
      { id: randomUUID(), suggestionId: suggestion2.id, title: "Revisar horário e frequência de envio das pesquisas", sortOrder: 2 },
      { id: randomUUID(), suggestionId: suggestion2.id, title: "Identificar e remover barreiras à participação", sortOrder: 3 },
    ],
  })

  const suggestion3 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(),
      tenantId,
      suggestionKey: `alert-score_drop-${tecDeptIdForSuggestionBlock}`,
      title: `Intervenção de bem-estar — Tecnologia`,
      description: `Alerta gerado — setor: Tecnologia, severidade: atenção. Queda de índice detectada. Quedas de score costumam indicar aumento de pressão, sobrecarga ou conflitos não endereçados. Este alerta foi gerado durante o período de alta carga identificado em Q3.`,
      priority: "high",
      reason: `Alerta score_drop no setor Tecnologia`,
      status: "converted",
      actionPlanId: plan1.id,
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: suggestion3.id, title: "Reunião de diagnóstico com liderança do setor", sortOrder: 0 },
      { id: randomUUID(), suggestionId: suggestion3.id, title: "Levantamento dos principais fatores de risco relatados", sortOrder: 1 },
      { id: randomUUID(), suggestionId: suggestion3.id, title: "Definir medidas corretivas e responsáveis", sortOrder: 2 },
      { id: randomUUID(), suggestionId: suggestion3.id, title: "Monitorar evolução nas próximas pesquisas", sortOrder: 3 },
    ],
  })

  const suggestion4 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(),
      tenantId,
      suggestionKey: "open-reports",
      title: "Responder relatos anônimos em aberto",
      description: `Existem relatos anônimos sem resolução registrada. Relatos sem acompanhamento comprometem a confiança dos colaboradores no canal e a evidência de conformidade com a NR-1.`,
      priority: "medium",
      reason: `Relatos anônimos em aberto sem resolução`,
      status: "dismissed",
      dismissedAt: subMonths(NOW, 1),
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: suggestion4.id, title: "Revisar relatos em aberto e definir responsáveis", sortOrder: 0 },
      { id: randomUUID(), suggestionId: suggestion4.id, title: "Registrar tratativa para cada relato sem resolução", sortOrder: 1 },
      { id: randomUUID(), suggestionId: suggestion4.id, title: "Arquivar relatos que não exigem ação adicional", sortOrder: 2 },
    ],
  })

  logger.info("✅ Sugestões de planos de ação criadas.")

  logger.info("📄 Criando documentos...")
  await prisma.document.createMany({
    data: DOCUMENT_TEMPLATES.map((doc) => ({
      id: randomUUID(),
      tenantId,
      title: doc.title,
      type: doc.type,
      isActive: true,
    })),
  })
  logger.info("✅ Documentos criados.")

  logger.info("📢 Criando relatos anônimos...")
  const _deptIdsArray = Object.values(deptMap)
  await prisma.anonymousReport.createMany({
    data: REPORT_TEMPLATES.map((report) => {
      const createdAt = addWeeks(ONE_YEAR_AGO, rand(4, 48))
      return {
        id: randomUUID(),
        tenantId,
        orgSlug: ORG_SLUG_NEW,
        content: report.content,
        category: report.category,
        status: report.status,
        resolvedAt: report.status === "resolved" ? addDays(createdAt, rand(3, 14)) : null,
        createdAt,
      }
    }),
  })
  logger.info("✅ Relatos anônimos criados.")

  logger.info("📋 Criando revisões PGR...")
  const pgrDepts = DEPT_PROFILES.map((p) => ({ name: p.name, id: deptMap[p.name] ?? "", empCount: p.employeeCount }))

  const pgrPeriods = [
    { period: "2025-06", reviewedAt: new Date("2025-06-30"), nextReviewAt: new Date("2025-12-31") },
    { period: "2025-12", reviewedAt: new Date("2025-12-31"), nextReviewAt: new Date("2026-06-30") },
    { period: "2026-03", reviewedAt: new Date("2026-03-31"), nextReviewAt: new Date("2026-09-30") },
  ]

  for (const pgr of pgrPeriods) {
    const pgrId = randomUUID()
    await prisma.pgrReview.create({
      data: {
        id: pgrId,
        tenantId,
        period: pgr.period,
        status: "completed",
        reviewedAt: pgr.reviewedAt,
        nextReviewAt: pgr.nextReviewAt,
        createdAt: pgr.reviewedAt,
      },
    })

    const deptResultRows: {
      id: string
      pgrReviewId: string
      departmentId: string
      departmentName: string
      employeeCount: number
      avgScore: number
      responseCount: number
      totalRecipients: number
      createdAt: Date
    }[] = []
    const questionResultRows: {
      id: string
      pgrReviewId: string
      departmentId: string
      questionId: string
      questionText: string
      questionOrder: number
      scoreDirection: string
      avgScore: number
      responseCount: number
      createdAt: Date
    }[] = []

    for (const dept of pgrDepts) {
      if (!dept.id) continue
      const weekOfPgr = Math.round(
        (pgr.reviewedAt.getTime() - ONE_YEAR_AGO.getTime()) / (7 * 24 * 3600 * 1000)
      )
      const profile = DEPT_PROFILES.find((p) => p.name === dept.name)
      const avgScore = profile ? clamp(profile.baseScore(Math.max(0, weekOfPgr))) : 3.5
      const responseCount = Math.round(dept.empCount * 0.82)
      const deptResultId = randomUUID()

      deptResultRows.push({
        id: deptResultId,
        pgrReviewId: pgrId,
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: dept.empCount,
        avgScore,
        responseCount,
        totalRecipients: dept.empCount,
        createdAt: pgr.reviewedAt,
      })

      const qIds = questionMap[dept.name] ?? []
      for (let qi = 0; qi < qIds.length; qi++) {
        const qId = qIds[qi]
        if (!qId) continue
        questionResultRows.push({
          id: randomUUID(),
          pgrReviewId: pgrId,
          departmentId: dept.id,
          questionId: qId,
          questionText: (QUESTION_BANKS["default"] ?? [])[qi]?.text ?? `Pergunta ${qi + 1}`,
          questionOrder: qi + 1,
          scoreDirection: "higher_is_better",
          avgScore: clamp(avgScore + (Math.random() - 0.5) * 0.6),
          responseCount,
          createdAt: pgr.reviewedAt,
        })
      }
    }

    await prisma.pgrDeptResult.createMany({ data: deptResultRows })
    await prisma.pgrQuestionResult.createMany({ data: questionResultRows })
  }

  logger.info("✅ Revisões PGR criadas.")

  await prisma.$disconnect()

  logger.info("")
  logger.info("🎉 Seed de demo concluído com sucesso!")
  logger.info("")
  logger.info("  Organização: Demo (slug: demo)")
  logger.info(`  Admin:       ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  logger.info(`  RH:          ${RH_EMAIL} / ${RH_PASSWORD}`)
  logger.info("")
  logger.info("  Departamentos: 6 (Tecnologia, Comercial, RH, Financeiro, Operações, Marketing)")
  logger.info("  Colaboradores: 41")
  logger.info("  Pesquisas:     ~1 ano de dados com scores variados")
  logger.info("  Alertas:       gerados automaticamente por perfil de setor")
  logger.info("  Planos de ação: 3 (1 concluído, 1 em progresso, 1 aberto)")
  logger.info("  Documentos:    7")
  logger.info("  Relatos anônimos: 6")
  logger.info("  Revisões PGR:  3")
}

main().catch((e) => {
  logger.error(e)
  process.exit(1)
})
