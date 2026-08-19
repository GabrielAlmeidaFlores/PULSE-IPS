import "dotenv/config"
import { env } from "../../env"
import { createLogger } from "../../libs/utils/logger"

const logger = createLogger("seed")

import { createHash, randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { addWeeks, addDays, addHours, subMonths, setHours, setMinutes } from "date-fns"

function toHealthIndex(avg: number): number {
  return Math.round(((avg - 1) / 4) * 100)
}

function healthIndexLabel(hi: number): string {
  if (hi >= 62) return "Saudável"
  if (hi >= 37) return "Atenção"
  return "Crítico"
}

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ORG_SLUG_OLD = "kyber-solucoes"
const ORG_SLUG_NEW = "demo"
const ORG_NAME_NEW = "Demo"
const TIMEZONE = "America/Sao_Paulo"

const ADMIN_EMAIL = "admin@demo.com"
const ADMIN_PASSWORD = "Testando123!"
const RH_EMAIL = "rh@demo.com"
const RH_PASSWORD = "Testando123!"

const NOW = new Date("2026-05-06T10:00:00Z")
const START = new Date("2024-03-04T09:00:00Z")
const TOTAL_WEEKS = 113

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, v))
}

function documentHash(doc: string): string {
  return createHash("sha256").update(doc).digest("hex")
}

// ──────────────────────────────────────────
// Question banks
// ──────────────────────────────────────────

const QUESTION_BANKS = {
  default: [
    { text: "Como você avalia seu nível de energia e disposição para trabalhar esta semana?", direction: "higher_is_better" },
    { text: "Você sente que sua carga de trabalho está equilibrada e gerenciável?", direction: "higher_is_better" },
    { text: "Como está a qualidade do relacionamento com sua equipe e liderança?", direction: "higher_is_better" },
    { text: "Você se sente reconhecido(a) e valorizado(a) pelo seu trabalho?", direction: "higher_is_better" },
    { text: "Qual é o seu nível de satisfação geral com o ambiente de trabalho?", direction: "higher_is_better" },
  ],
  burnout: [
    { text: "Você tem conseguido se desligar do trabalho nos momentos de descanso?", direction: "higher_is_better" },
    { text: "Com que frequência você se sente esgotado(a) ao final da jornada?", direction: "lower_is_better" },
    { text: "Você tem autonomia suficiente para organizar sua própria rotina de trabalho?", direction: "higher_is_better" },
    { text: "O volume de demandas que chegam até você é administrável?", direction: "higher_is_better" },
  ],
  physical: [
    { text: "As condições físicas do ambiente de trabalho (temperatura, iluminação, ruído) são adequadas?", direction: "higher_is_better" },
    { text: "Os equipamentos e ferramentas que você usa estão em boas condições de uso?", direction: "higher_is_better" },
    { text: "Você sente dores físicas (costas, pescoço, pulsos) decorrentes das atividades de trabalho?", direction: "lower_is_better" },
    { text: "O ambiente de trabalho oferece condições adequadas de ergonomia?", direction: "higher_is_better" },
  ],
  leadership: [
    { text: "Você recebe feedbacks regulares e construtivos sobre seu desempenho?", direction: "higher_is_better" },
    { text: "Sua liderança demonstra interesse genuíno pelo seu bem-estar?", direction: "higher_is_better" },
    { text: "Você sente clareza sobre as expectativas e metas do seu trabalho?", direction: "higher_is_better" },
    { text: "Existe um canal aberto para comunicar preocupações à sua liderança?", direction: "higher_is_better" },
  ],
}

interface DeptProfile {
  deptName: string
  employeeCount: number
  workDays: number[]
  workStartTime: string
  workEndTime: string
  startWeek: number
  baseScore: (w: number) => number
  adherenceRate: (w: number) => number
}

const DEPT_PROFILES: DeptProfile[] = [
  {
    deptName: "Tecnologia",
    employeeCount: 8,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (w) => {
      if (w < 35) return clamp(4.1 + (Math.random() - 0.5) * 0.5)
      if (w < 71) return clamp(3.0 + (Math.random() - 0.5) * 0.8)
      if (w < 97) return clamp(3.6 + (Math.random() - 0.5) * 0.5)
      return clamp(4.0 + (Math.random() - 0.5) * 0.4)
    },
    adherenceRate: (w) => (w >= 35 && w < 71 ? 0.68 + Math.random() * 0.1 : 0.86 + Math.random() * 0.08),
  },
  {
    deptName: "Comercial",
    employeeCount: 7,
    workDays: [1, 2, 3, 4, 5, 6],
    workStartTime: "08:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (w) => {
      const weekInYear = w % 52
      if (weekInYear >= 34 && weekInYear <= 42) return clamp(3.5 + (Math.random() - 0.5) * 0.6)
      return clamp(4.0 + (Math.random() - 0.5) * 0.5)
    },
    adherenceRate: (w) => {
      const weekInYear = w % 52
      return weekInYear >= 34 && weekInYear <= 42 ? 0.80 + Math.random() * 0.08 : 0.91 + Math.random() * 0.07
    },
  },
  {
    deptName: "Recursos Humanos",
    employeeCount: 5,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (_) => clamp(4.3 + (Math.random() - 0.5) * 0.4),
    adherenceRate: (_) => 0.92 + Math.random() * 0.08,
  },
  {
    deptName: "Financeiro",
    employeeCount: 6,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (w) => clamp(3.9 - w * 0.0095 + (Math.random() - 0.5) * 0.5),
    adherenceRate: (w) => clamp(0.85 - w * 0.002 + (Math.random() - 0.5) * 0.06, 0.48, 0.88),
  },
  {
    deptName: "Operações",
    employeeCount: 9,
    workDays: [0, 1, 2, 3, 4, 5, 6],
    workStartTime: "07:00",
    workEndTime: "16:00",
    startWeek: 0,
    baseScore: (w) => {
      if (w < 52) return clamp(2.9 + (Math.random() - 0.5) * 0.6)
      if (w < 87) return clamp(2.1 + (Math.random() - 0.5) * 0.5)
      return clamp(2.7 + (Math.random() - 0.5) * 0.5)
    },
    adherenceRate: (w) => (w >= 52 && w < 87 ? 0.50 + Math.random() * 0.12 : 0.68 + Math.random() * 0.12),
  },
  {
    deptName: "Marketing",
    employeeCount: 6,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (w) => {
      const cycle = Math.sin((w / 52) * Math.PI * 2)
      return clamp(3.6 + cycle * 0.6 + (Math.random() - 0.5) * 0.4)
    },
    adherenceRate: (_) => 0.74 + Math.random() * 0.18,
  },
  {
    deptName: "Suporte",
    employeeCount: 5,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 61,
    baseScore: (w) => {
      const relW = w - 61
      if (relW < 14) return clamp(4.0 + (Math.random() - 0.5) * 0.5)
      if (relW < 34) return clamp(3.2 + (Math.random() - 0.5) * 0.6)
      return clamp(3.8 + (Math.random() - 0.5) * 0.4)
    },
    adherenceRate: (w) => {
      const relW = w - 61
      return relW >= 14 && relW < 34 ? 0.74 + Math.random() * 0.1 : 0.86 + Math.random() * 0.08
    },
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
  Suporte: [
    { name: "Claudia Araújo", phone: "+5511911110042", email: "claudia.araujo@demo.com" },
    { name: "Henrique Vaz", phone: "+5511911110043", email: "henrique.vaz@demo.com" },
    { name: "Patricia Neves", phone: "+5511911110044", email: "patricia.neves@demo.com" },
    { name: "Marcos Silveira", phone: "+5511911110045", email: "marcos.silveira@demo.com" },
    { name: "Juliana Castro", phone: "+5511911110046", email: "juliana.castro@demo.com" },
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
      data: { id: randomUUID(), slug: ORG_SLUG_NEW, name: ORG_NAME_NEW, timezone: TIMEZONE, billingStatus: "active", isActive: true },
    })
  }

  const tenantId = org.id
  logger.info(`✅ Org: ${org.name} (${tenantId})`)

  logger.info("🗑️  Limpando dados antigos...")
  await prisma.organization.update({ where: { id: tenantId }, data: { slug: ORG_SLUG_NEW, name: ORG_NAME_NEW } })
  await prisma.climateSurveyResponseItem.deleteMany({ where: { climateSurveyResponse: { tenantId } } })
  await prisma.climateSurveyAnalyticsEvent.deleteMany({ where: { tenantId } })
  await prisma.climateSurveyResponseSession.deleteMany({ where: { tenantId } })
  await prisma.climateSurveyResponse.deleteMany({ where: { tenantId } })
  await prisma.climateSurveyResponseToken.deleteMany({ where: { tenantId } })
  await prisma.climateSurveyDispatch.deleteMany({ where: { tenantId } })
  await prisma.climateSurveyQuestion.deleteMany({ where: { tenantId } })
  await prisma.climateSurveyConfiguration.deleteMany({ where: { tenantId } })
  await prisma.emailLog.deleteMany({ where: { tenantId } })
  await prisma.healthSurveyResponseItem.deleteMany({ where: { healthSurveyResponse: { tenantId } } })
  await prisma.healthSurveyResponse.deleteMany({ where: { tenantId } })
  await prisma.healthSurveyResponseToken.deleteMany({ where: { tenantId } })
  await prisma.healthSurveyDispatch.deleteMany({ where: { tenantId } })
  await prisma.healthSurveyQuestion.deleteMany({ where: { tenantId } })
  await prisma.healthSurveyConfiguration.deleteMany({ where: { tenantId } })
  await prisma.employeeConsent.deleteMany({ where: { tenantId } })
  await prisma.employee.deleteMany({ where: { tenantId } })
  await prisma.pgrReview.deleteMany({ where: { tenantId } })
  await prisma.anonymousReport.deleteMany({ where: { tenantId } })
  await prisma.actionPlanTask.deleteMany({ where: { tenantId } })
  await prisma.actionPlanSuggestionTask.deleteMany({ where: { suggestion: { tenantId } } })
  await prisma.actionPlanSuggestion.deleteMany({ where: { tenantId } })
  await prisma.actionPlan.deleteMany({ where: { tenantId } })
  await prisma.document.deleteMany({ where: { tenantId } })
  await prisma.alert.deleteMany({ where: { tenantId } })
  await prisma.department.deleteMany({ where: { tenantId } })
  await prisma.platformTermsAcceptance.deleteMany({ where: { user: { tenantId } } })
  await prisma.auditLog.deleteMany({ where: { tenantId } })
  await prisma.messageLog.deleteMany({ where: { tenantId } })
  await prisma.organizationSubscription.deleteMany({ where: { tenantId } })
  await prisma.organizationUser.deleteMany({ where: { tenantId } })
  logger.info("✅ Dados limpos.")

  logger.info("👤 Criando usuários...")
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const rhPasswordHash = await bcrypt.hash(RH_PASSWORD, 10)
  const consentTermVersion = await prisma.consentTermVersion.findFirst({ where: { isActive: true } })
  if (!consentTermVersion) throw new Error("Nenhuma versão de TCLE ativa encontrada. Execute yarn seed primeiro.")
  const platformTermsVersion = await prisma.platformTermsVersion.findFirst({ where: { isActive: true } })
  if (!platformTermsVersion) throw new Error("Nenhuma versão de Termos da Plataforma ativa encontrada.")

  const adminUser = await prisma.organizationUser.create({
    data: { id: randomUUID(), tenantId, email: ADMIN_EMAIL, passwordHash, name: "Admin Demo", role: "admin", isActive: true, emailVerifiedAt: START },
  })
  const rhUser = await prisma.organizationUser.create({
    data: { id: randomUUID(), tenantId, email: RH_EMAIL, passwordHash: rhPasswordHash, name: "RH Demo", role: "rh", isActive: true, emailVerifiedAt: START },
  })
  await prisma.platformTermsAcceptance.createMany({
    data: [
      { id: randomUUID(), termsVersionId: platformTermsVersion.id, userId: adminUser.id, acceptedAt: START, ipAddress: "127.0.0.1", userAgent: "seed/demo" },
      { id: randomUUID(), termsVersionId: platformTermsVersion.id, userId: rhUser.id, acceptedAt: START, ipAddress: "127.0.0.1", userAgent: "seed/demo" },
    ],
  })
  logger.info(`✅ Usuários: ${ADMIN_EMAIL}, ${RH_EMAIL}`)

  logger.info("💳 Criando assinatura Professional...")
  const professionalPlanPrice = await prisma.planPrice.findFirst({
    where: { externalPriceId: "price_professional_monthly", isActive: true },
    include: { plan: true },
  })
  if (!professionalPlanPrice) throw new Error("Plano Professional não encontrado. Execute yarn seed primeiro.")

  const subscription = await prisma.organizationSubscription.create({
    data: {
      id: randomUUID(),
      tenantId,
      planId: professionalPlanPrice.planId,
      externalSubscriptionId: `sub_demo_${tenantId.slice(0, 8)}`,
      status: "active",
      currentPeriodStart: START,
      currentPeriodEnd: addDays(NOW, 25),
      cancelAtPeriodEnd: false,
      snapshotPlanName: "Professional",
      snapshotMaxEmployees: 150,
      snapshotPriceInCents: professionalPlanPrice.priceInCents,
      snapshotInterval: "monthly",
      snapshotExternalPriceId: "price_professional_monthly",
    },
  })

  const PROFESSIONAL_FEATURES = ["action_plans", "documents", "anonymous_reports", "pgr", "messaging", "climate_surveys"] as const
  await prisma.subscriptionFeature.createMany({
    data: PROFESSIONAL_FEATURES.map((feature) => ({ subscriptionId: subscription.id, feature })),
  })
  logger.info("✅ Assinatura Professional criada.")

  logger.info("🏢 Criando departamentos, colaboradores e configurações...")
  const deptMap: Record<string, string> = {}
  const employeeMap: Record<string, string[]> = {}
  for (const deptProfile of DEPT_PROFILES) {
    const deptCreatedAt = addWeeks(START, deptProfile.startWeek)

    const dept = await prisma.department.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: deptProfile.deptName,
        isActive: true,
        workStartTime: deptProfile.workStartTime,
        workEndTime: deptProfile.workEndTime,
        createdAt: deptCreatedAt,
      },
    })
    deptMap[deptProfile.deptName] = dept.id

    await prisma.departmentWorkDay.createMany({
      data: deptProfile.workDays.map((d) => ({ departmentId: dept.id, dayOfWeek: d })),
    })

    const deptEmployees = EMPLOYEES_BY_DEPT[deptProfile.deptName] ?? []
    const empIds: string[] = []
    let empIdx = 0
    for (const emp of deptEmployees) {
      empIdx++
      const empRecord = await prisma.employee.create({
        data: { id: randomUUID(), tenantId, departmentId: dept.id, name: emp.name, phone: emp.phone, email: emp.email ?? null, status: "active", createdAt: deptCreatedAt },
      })
      empIds.push(empRecord.id)

      await prisma.employeeConsent.create({
        data: {
          id: randomUUID(), tenantId, employeeId: empRecord.id, consentTermVersionId: consentTermVersion.id,
          event: "accepted", source: "message_link",
          documentHash: documentHash(`000.000.000-${empIdx.toString().padStart(2, "0")}`),
          createdAt: addDays(deptCreatedAt, 1),
        },
      })
    }
    employeeMap[deptProfile.deptName] = empIds
  }

  const globalConfig = await prisma.healthSurveyConfiguration.create({
    data: { id: randomUUID(), tenantId, name: "Pesquisa de Saúde Ocupacional", frequency: "weekly", dispatchTime: "09:00", isActive: true, createdAt: START },
  })

  for (const deptProfile of DEPT_PROFILES) {
    const deptId = deptMap[deptProfile.deptName]
    if (!deptId) continue
    await prisma.healthSurveyConfigDepartment.create({ data: { configId: globalConfig.id, departmentId: deptId } })
  }

  await prisma.healthSurveyConfigWorkDay.createMany({
    data: [1, 2, 3, 4, 5].map((d) => ({ configId: globalConfig.id, dayOfWeek: d })),
  })

  const globalQIds: string[] = []
  for (let qi = 0; qi < QUESTION_BANKS.default.length; qi++) {
    const q = QUESTION_BANKS.default[qi]
    if (!q) continue
    const question = await prisma.healthSurveyQuestion.create({
      data: { id: randomUUID(), tenantId, healthSurveyConfigurationId: globalConfig.id, text: q.text, order: qi + 1, scoreDirection: q.direction, isActive: true },
    })
    globalQIds.push(question.id)
  }
  logger.info("✅ Departamentos, colaboradores e configuração criados.")

  logger.info(`📊 Gerando ${TOTAL_WEEKS} semanas de pesquisas (26 meses) em memória...`)

  type AlertRow = {
    id: string; tenantId: string; departmentId: string | null
    type: string; severity: string; message: string
    isRead: boolean; resolvedAt: Date | null; createdAt: Date
  }

  type DispatchRow = {
    id: string; tenantId: string; healthSurveyConfigurationId: string
    scheduledAt: Date; dispatchedAt: Date; adherenceCheckedAt: Date
    status: string; signedLinkToken: string
  }

  type DeptDispatchRow = {
    id: string; dispatchId: string; departmentId: string
    totalRecipients: number; totalResponses: number
  }

  type TokenRow = {
    id: string; tenantId: string; dispatchId: string; employeeId: string
    token: string; expiresAt: Date; usedAt: Date; workStartTime: string; workEndTime: string; createdAt: Date
  }

  type ResponseRow = { id: string; tenantId: string; dispatchId: string; departmentId: string; createdAt: Date }
  type ItemRow = { id: string; healthSurveyResponseId: string; questionId: string; score: number }

  const alertsToCreate: AlertRow[] = []
  const allDispatches: DispatchRow[] = []
  const allDeptDispatches: DeptDispatchRow[] = []
  const allTokens: TokenRow[] = []
  const allResponses: ResponseRow[] = []
  const allItems: ItemRow[] = []

  for (const deptProfile of DEPT_PROFILES) {
    const deptId = deptMap[deptProfile.deptName]
    const empIds = employeeMap[deptProfile.deptName] ?? []
    if (!deptId || empIds.length === 0) continue

    let prevAvgScore = 3.5

    for (let w = deptProfile.startWeek; w < TOTAL_WEEKS; w += 1) {
      const dispatchDate = setMinutes(setHours(addWeeks(START, w), 9), 0)
      if (dispatchDate > NOW) break

      const baseScore = deptProfile.baseScore(w)
      const adherence = deptProfile.adherenceRate(w)
      const respondentCount = Math.max(1, Math.round(empIds.length * adherence))
      const respondents = empIds.slice(0, respondentCount)
      const dispatchId = randomUUID()

      allDispatches.push({
        id: dispatchId,
        tenantId,
        healthSurveyConfigurationId: globalConfig.id,
        scheduledAt: dispatchDate,
        dispatchedAt: dispatchDate,
        adherenceCheckedAt: addDays(dispatchDate, 2),
        status: "available",
        signedLinkToken: randomUUID(),
      })

      allDeptDispatches.push({
        id: randomUUID(),
        dispatchId,
        departmentId: deptId,
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
          id: tokenId, tenantId, dispatchId, employeeId: empId,
          token: randomUUID(), expiresAt: addDays(dispatchDate, 2), usedAt,
          workStartTime: deptProfile.workStartTime, workEndTime: deptProfile.workEndTime,
          createdAt: dispatchDate,
        })

        allResponses.push({ id: responseId, tenantId, dispatchId, departmentId: deptId, createdAt: usedAt })

        for (const qId of globalQIds) {
          allItems.push({
            id: randomUUID(), healthSurveyResponseId: responseId, questionId: qId,
            score: clamp(Math.round(empScore + (Math.random() - 0.5) * 0.8)),
          })
        }
      }

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3.0

      if (adherence < 0.8 && empIds.length >= 5) {
        const pct = Math.round(adherence * 100)
        const alertType = adherence < 0.5 ? "no_response" : "low_adherence"
        alertsToCreate.push({
          id: randomUUID(), tenantId, departmentId: deptId,
          type: alertType,
          severity: adherence < 0.3 ? "critical" : "warning",
          message: `Taxa de adesão: ${pct}% (${respondents.length}/${empIds.length}) — ${deptProfile.deptName}`,
          isRead: w < TOTAL_WEEKS - 10,
          resolvedAt: w < TOTAL_WEEKS - 10 ? addDays(dispatchDate, rand(3, 10)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      if (prevAvgScore - avgScore > 1.0) {
        const drop = prevAvgScore - avgScore
        alertsToCreate.push({
          id: randomUUID(), tenantId, departmentId: deptId,
          type: "score_drop",
          severity: drop > 2 ? "critical" : "warning",
          message: `Queda de ${drop.toFixed(1)} pontos — ${deptProfile.deptName}: de ${toHealthIndex(prevAvgScore)}% para ${toHealthIndex(avgScore)}%.`,
          isRead: w < TOTAL_WEEKS - 10,
          resolvedAt: w < TOTAL_WEEKS - 10 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      if (avgScore < 3.0 && empIds.length >= 5) {
        const hi = toHealthIndex(avgScore)
        alertsToCreate.push({
          id: randomUUID(), tenantId, departmentId: deptId,
          type: "low_score",
          severity: avgScore < 2 ? "critical" : "warning",
          message: `Índice de saúde baixo — ${deptProfile.deptName}: ${hi}% (${healthIndexLabel(hi)}).`,
          isRead: w < TOTAL_WEEKS - 10,
          resolvedAt: w < TOTAL_WEEKS - 10 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      prevAvgScore = avgScore
    }

    if (deptProfile.deptName === "Financeiro") {
      alertsToCreate.push({
        id: randomUUID(), tenantId, departmentId: deptId,
        type: "negative_trend", severity: "warning",
        message: `Financeiro apresenta tendência negativa por 3 períodos consecutivos abaixo da média histórica. Índice atual: ${toHealthIndex(2.9)}%.`,
        isRead: false, resolvedAt: null, createdAt: addDays(NOW, -7),
      })
    }
    if (deptProfile.deptName === "Operações") {
      alertsToCreate.push({
        id: randomUUID(), tenantId, departmentId: deptId,
        type: "negative_trend", severity: "critical",
        message: `Operações com tendência negativa persistente — índice em ${toHealthIndex(2.3)}% por 5 períodos consecutivos.`,
        isRead: false, resolvedAt: null, createdAt: addDays(NOW, -5),
      })
    }
  }

  alertsToCreate.push({
    id: randomUUID(), tenantId, departmentId: null,
    type: "pgr_review_due", severity: "warning",
    message: `Revisão PGR prevista para ${addDays(NOW, 28).toLocaleDateString("pt-BR")}.`,
    isRead: false, resolvedAt: null, createdAt: addDays(NOW, -3),
  })

  logger.info(`📥 Inserindo ${allDispatches.length} dispatches, ${allDeptDispatches.length} dept-dispatches, ${allTokens.length} tokens, ${allResponses.length} respostas, ${allItems.length} itens...`)

  const BATCH = 500
  await prisma.healthSurveyDispatch.createMany({ data: allDispatches })
  for (let i = 0; i < allDeptDispatches.length; i += BATCH) {
    await prisma.healthSurveyDeptDispatch.createMany({ data: allDeptDispatches.slice(i, i + BATCH) })
  }
  for (let i = 0; i < allTokens.length; i += BATCH) {
    await prisma.healthSurveyResponseToken.createMany({ data: allTokens.slice(i, i + BATCH) })
  }
  for (let i = 0; i < allResponses.length; i += BATCH) {
    await prisma.healthSurveyResponse.createMany({ data: allResponses.slice(i, i + BATCH) })
  }
  for (let i = 0; i < allItems.length; i += BATCH) {
    await prisma.healthSurveyResponseItem.createMany({ data: allItems.slice(i, i + BATCH) })
  }
  logger.info(`✅ Pesquisas inseridas.`)

  logger.info(`🔔 Inserindo ${alertsToCreate.length} alertas...`)
  await prisma.alert.createMany({ data: alertsToCreate })

  logger.info("📋 Criando planos de ação...")
  const tecDeptId = deptMap["Tecnologia"] ?? ""
  const finDeptId = deptMap["Financeiro"] ?? ""
  const opsDeptId = deptMap["Operações"] ?? ""

  const plan1 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(), tenantId,
      title: "Reduzir sobrecarga e restaurar bem-estar — Tecnologia",
      description: "Score de bem-estar em Tecnologia caiu de 4.1 para 2.8 entre maio e outubro/2025 (Q3 grande projeto). Pesquisa de carga de trabalho confirmou exaustão. Este plano implementa rituais de bem-estar, limite de horas extras e canal de feedback contínuo.",
      status: "completed", priority: "high",
      dueDate: addDays(addWeeks(START, 80), 0), completedAt: addWeeks(START, 83), createdAt: addWeeks(START, 71),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Implementar retrospectiva quinzenal de bem-estar", assigneeId: rhUser.id, dueDate: addWeeks(START, 73), completedAt: addWeeks(START, 72) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Limitar horas extras a 4h/semana por colaborador", assigneeId: adminUser.id, dueDate: addWeeks(START, 75), completedAt: addWeeks(START, 76) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Criar canal direto de feedback contínuo com gestores", assigneeId: rhUser.id, dueDate: addWeeks(START, 77), completedAt: addWeeks(START, 78) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Reduzir escopo do projeto para aliviar pressão imediata", assigneeId: adminUser.id, dueDate: addWeeks(START, 74), completedAt: addWeeks(START, 73) },
    ],
  })

  const plan2 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(), tenantId,
      title: "Reverter tendência negativa — Financeiro",
      description: "Score do Financeiro declina continuamente nos últimos 26 meses (3.9 → 2.8). Análise qualitativa aponta pressão crescente por fechamentos mensais, metas irreais e falta de reconhecimento. Plano de intervenção urgente.",
      status: "in_progress", priority: "high",
      dueDate: addDays(NOW, 45), completedAt: null, createdAt: addDays(NOW, -14),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "1:1s individuais com toda a equipe Financeiro", assigneeId: rhUser.id, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Revisão das metas e prazos de fechamento contábil", assigneeId: adminUser.id, dueDate: addDays(NOW, 14), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Implantar programa de reconhecimento mensal", assigneeId: rhUser.id, dueDate: addDays(NOW, 21), completedAt: addDays(NOW, -2) },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Pesquisa qualitativa aprofundada (voluntários)", assigneeId: rhUser.id, dueDate: addDays(NOW, 10), completedAt: null },
    ],
  })

  const plan3 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(), tenantId,
      title: "Intervenção emergencial — Operações",
      description: "Crise em Operações: score < 2.2 por 8 semanas consecutivas, adesão < 55%, múltiplos relatos anônimos de sobrecarga e conflitos com lideranças. Plano de emergência com ações imediatas.",
      status: "open", priority: "high",
      dueDate: addDays(NOW, 21), completedAt: null, createdAt: addDays(NOW, -5),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Reunião de escuta ativa com toda a equipe de Operações", assigneeId: adminUser.id, dueDate: addDays(NOW, 3), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Avaliação ergonômica completa do ambiente físico", assigneeId: rhUser.id, dueDate: addDays(NOW, 5), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Revisão da escala de turnos e banco de horas", assigneeId: adminUser.id, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Processo de mediação para conflitos identificados", assigneeId: rhUser.id, dueDate: addDays(NOW, 10), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Check-in semanal presencial com liderança do setor", assigneeId: adminUser.id, dueDate: addDays(NOW, 21), completedAt: null },
    ],
  })

  const plan4 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(), tenantId,
      title: "Melhorias ergonômicas — Operações",
      description: "Pesquisa de Segurança e Ergonomia detectou score 2.4 no ambiente físico de Operações. Colaboradores relatam dores nas costas e equipamentos deteriorados. Plano de modernização do espaço físico.",
      status: "completed", priority: "medium",
      dueDate: addWeeks(START, 68), completedAt: addWeeks(START, 72), createdAt: addWeeks(START, 58),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Laudo de ergonomia por empresa especializada", assigneeId: adminUser.id, dueDate: addWeeks(START, 60), completedAt: addWeeks(START, 61) },
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Substituição de 9 cadeiras e ajuste de mesas", assigneeId: adminUser.id, dueDate: addWeeks(START, 64), completedAt: addWeeks(START, 65) },
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Treinamento de ginástica laboral 2x por semana", assigneeId: rhUser.id, dueDate: addWeeks(START, 66), completedAt: addWeeks(START, 67) },
    ],
  })

  const plan5 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(), tenantId,
      title: "Engajamento e adesão às pesquisas — Suporte",
      description: "Adesão às pesquisas em Suporte caiu de 87% para 74% após o 14º mês. Análise sugere sobrecarga de atendimento e falta de clareza sobre a importância da participação.",
      status: "in_progress", priority: "medium",
      dueDate: addDays(NOW, 30), completedAt: null, createdAt: addDays(NOW, -21),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan5.id, title: "Comunicado interno sobre importância das pesquisas de saúde", assigneeId: rhUser.id, dueDate: addDays(NOW, 5), completedAt: addDays(NOW, -14) },
      { id: randomUUID(), tenantId, actionPlanId: plan5.id, title: "Ajustar horário de envio para após o pico de chamados", assigneeId: adminUser.id, dueDate: addDays(NOW, 10), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan5.id, title: "Sessão de feedback sobre rotação de plantões", assigneeId: rhUser.id, dueDate: addDays(NOW, 21), completedAt: null },
    ],
  })

  const plan6 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(), tenantId,
      title: "Gestão do pico de final de ano — Comercial",
      description: "Dados históricos mostram queda recorrente de score em Comercial todo mês de nov-dez (pressão de metas anuais). Plano preventivo para preparar a equipe para o próximo ciclo.",
      status: "open", priority: "low",
      dueDate: new Date("2026-10-31"), completedAt: null, createdAt: addDays(NOW, -3),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan6.id, title: "Workshop de gestão de estresse e pressão para Comercial", assigneeId: rhUser.id, dueDate: new Date("2026-09-30"), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan6.id, title: "Revisar metas de novembro e dezembro com base em histórico real", assigneeId: adminUser.id, dueDate: new Date("2026-10-15"), completedAt: null },
    ],
  })

  logger.info("✅ Planos de ação criados.")

  logger.info("💡 Criando sugestões de planos de ação...")
  const s1 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(), tenantId,
      suggestionKey: `alert-negative_trend-${finDeptId}`,
      title: "Plano de melhoria contínua — Financeiro",
      description: "Alerta: tendência negativa detectada no setor Financeiro. O índice de saúde cai consistentemente há 3+ períodos. Tendências prolongadas aumentam o risco de burnout e comprometem a conformidade com a NR-1.",
      priority: "high", reason: "Tendência negativa persistente no setor Financeiro — 3 períodos consecutivos abaixo da média histórica",
      status: "pending",
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: s1.id, title: "Análise detalhada das respostas dos últimos 3 meses", sortOrder: 0 },
      { id: randomUUID(), suggestionId: s1.id, title: "Reunião de diagnóstico com liderança do Financeiro", sortOrder: 1 },
      { id: randomUUID(), suggestionId: s1.id, title: "Definir metas de melhoria mensuráveis com prazo de 60 dias", sortOrder: 2 },
      { id: randomUUID(), suggestionId: s1.id, title: "Programa de reconhecimento vinculado a indicadores de bem-estar", sortOrder: 3 },
    ],
  })

  const s2 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(), tenantId,
      suggestionKey: `alert-no_response-${opsDeptId}`,
      title: "Aumentar adesão às pesquisas — Operações",
      description: "Taxa de adesão em Operações abaixo de 55% por 5 semanas. Baixa participação compromete a representatividade dos dados e viola a integridade do programa de monitoramento NR-1.",
      priority: "high", reason: "Adesão crítica em Operações — abaixo do mínimo aceitável de 80%",
      status: "pending",
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: s2.id, title: "Reunião com supervisores de Operações para alinhar importância", sortOrder: 0 },
      { id: randomUUID(), suggestionId: s2.id, title: "Revisão do horário de envio das pesquisas (turno vs. horário)", sortOrder: 1 },
      { id: randomUUID(), suggestionId: s2.id, title: "Criar incentivo de equipe para participação coletiva", sortOrder: 2 },
    ],
  })

  const s3 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(), tenantId,
      suggestionKey: `converted-score_drop-tec-${tecDeptId}`,
      title: "Intervenção de bem-estar — Tecnologia (Q3/2025)",
      description: "Queda abrupta de score detectada em Tecnologia durante o projeto de grande porte. Score caiu de 4.1 para 2.8 em 8 semanas — maior queda registrada na organização.",
      priority: "high", reason: "Queda de score acima de 2.0 pontos em Tecnologia — alerta crítico",
      status: "converted",
      actionPlanId: plan1.id,
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: s3.id, title: "Diagnóstico rápido com liderança de Tecnologia", sortOrder: 0 },
      { id: randomUUID(), suggestionId: s3.id, title: "Levantamento dos fatores de risco relatados", sortOrder: 1 },
      { id: randomUUID(), suggestionId: s3.id, title: "Implementar medidas corretivas imediatas", sortOrder: 2 },
    ],
  })

  const s4 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(), tenantId,
      suggestionKey: "dismissed-open-reports-2024",
      title: "Endereçar relatos anônimos em aberto",
      description: "Existem 4 relatos anônimos sem resolução registrada há mais de 30 dias. Relatos sem acompanhamento corroem a confiança no canal e comprometem a evidência de conformidade.",
      priority: "medium", reason: "Relatos anônimos sem resolução por mais de 30 dias",
      status: "dismissed", dismissedAt: subMonths(NOW, 18),
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: s4.id, title: "Revisar e categorizar todos os relatos em aberto", sortOrder: 0 },
      { id: randomUUID(), suggestionId: s4.id, title: "Definir responsáveis e SLA para resposta", sortOrder: 1 },
    ],
  })

  const s5 = await prisma.actionPlanSuggestion.create({
    data: {
      id: randomUUID(), tenantId,
      suggestionKey: `alert-low_score-ops-ergonomia-${opsDeptId}`,
      title: "Programa de saúde física — Operações",
      description: "Pesquisa de Segurança e Ergonomia detectou score médio de 2.4 em Operações. Indicadores de dor física e ambiente inadequado estão acima do aceitável para atividades operacionais.",
      priority: "high", reason: "Score de ergonomia/ambiente físico crítico em Operações — 2.4/5.0",
      status: "converted",
      actionPlanId: plan4.id,
    },
  })
  await prisma.actionPlanSuggestionTask.createMany({
    data: [
      { id: randomUUID(), suggestionId: s5.id, title: "Laudo técnico de ergonomia", sortOrder: 0 },
      { id: randomUUID(), suggestionId: s5.id, title: "Substituição de equipamentos inadequados", sortOrder: 1 },
      { id: randomUUID(), suggestionId: s5.id, title: "Ginástica laboral preventiva", sortOrder: 2 },
    ],
  })

  logger.info("✅ Sugestões criadas.")

  logger.info("📄 Criando documentos...")
  await prisma.document.createMany({
    data: [
      { id: randomUUID(), tenantId, title: "Programa de Gerenciamento de Riscos (PGR) — 2024", type: "pgr", isActive: true },
      { id: randomUUID(), tenantId, title: "Programa de Gerenciamento de Riscos (PGR) — 2025", type: "pgr", isActive: true },
      { id: randomUUID(), tenantId, title: "Manual de Segurança e Saúde Ocupacional", type: "manual", isActive: true },
      { id: randomUUID(), tenantId, title: "Plano de Ação Corretiva — Operações Q3/2025", type: "action_plan", isActive: true },
      { id: randomUUID(), tenantId, title: "Relatório de Incidentes — Outubro 2025", type: "report", isActive: true },
      { id: randomUUID(), tenantId, title: "Treinamento NR-1: Riscos Psicossociais no Trabalho", type: "training", isActive: true },
      { id: randomUUID(), tenantId, title: "Política de Bem-Estar e Saúde Mental", type: "policy", isActive: true },
      { id: randomUUID(), tenantId, title: "Ata de Reunião CIPA — Novembro 2025", type: "meeting_minutes", isActive: true },
      { id: randomUUID(), tenantId, title: "Laudo Ergonômico — Operações (2025)", type: "report", isActive: true },
      { id: randomUUID(), tenantId, title: "Acordo de Metas Revisado — Financeiro 2026", type: "policy", isActive: true },
    ],
  })
  logger.info("✅ Documentos criados.")

  logger.info("📢 Criando relatos anônimos...")
  await prisma.anonymousReport.createMany({
    data: [
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Estou com uma pressão enorme para entregar resultados impossíveis em prazos irreais. Isso está afetando meu sono e saúde física.", category: "overload", status: "resolved", resolvedAt: addWeeks(START, 38), createdAt: addWeeks(START, 34) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Um colega faz comentários inapropriados e cria um ambiente hostil. Já aconteceu mais de uma vez na frente de outros.", category: "harassment", status: "resolved", resolvedAt: addWeeks(START, 20), createdAt: addWeeks(START, 16) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "As cadeiras e mesas na área de operações estão causando dores nas costas. Precisamos de ergonomia adequada urgentemente.", category: "physical_environment", status: "resolved", resolvedAt: addWeeks(START, 68), createdAt: addWeeks(START, 59) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Há um conflito sério entre dois líderes que está afetando toda a equipe. Precisamos de mediação profissional urgente.", category: "conflict", status: "analyzing", resolvedAt: null, createdAt: addWeeks(START, 55) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "O volume de reuniões está completamente excessivo. Passamos mais tempo em reunião do que trabalhando de verdade.", category: "overload", status: "resolved", resolvedAt: addWeeks(START, 48), createdAt: addWeeks(START, 44) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Me sinto muito mal com o nível de cobrança e microgerenciamento. Não tenho autonomia nenhuma para fazer meu trabalho.", category: "other", status: "resolved", resolvedAt: addWeeks(START, 82), createdAt: addWeeks(START, 78) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "A temperatura do escritório está insuportável no verão. O ar-condicionado central não funciona adequadamente na ala leste.", category: "physical_environment", status: "resolved", resolvedAt: addWeeks(START, 12), createdAt: addWeeks(START, 8) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Sinto que as metas do setor financeiro são determinadas sem levar em conta a realidade operacional. Isso gera estresse crônico.", category: "overload", status: "analyzing", resolvedAt: null, createdAt: addWeeks(START, 90) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Tenho me sentindo invisível no time. Minha contribuição nunca é reconhecida publicamente, mesmo quando os resultados são bons.", category: "other", status: "open", resolvedAt: null, createdAt: addDays(NOW, -18) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "O processo de onboarding para novos colaboradores de Suporte é inexistente. Estou há 2 meses sem treinamento adequado.", category: "other", status: "open", resolvedAt: null, createdAt: addDays(NOW, -10) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Há favoritismo explícito na distribuição de projetos premium. Sempre as mesmas pessoas recebem as oportunidades melhores.", category: "conflict", status: "analyzing", resolvedAt: null, createdAt: addDays(NOW, -6) },
      { id: randomUUID(), tenantId, orgSlug: ORG_SLUG_NEW, content: "Estou com pensamentos negativos recorrentes sobre o trabalho e não estou conseguindo dormir há semanas.", category: "other", status: "open", resolvedAt: null, createdAt: addDays(NOW, -2) },
    ],
  })
  logger.info("✅ Relatos anônimos criados.")

  logger.info("📋 Criando revisões PGR...")
  type PgrDeptResultRow = {
    id: string; pgrReviewId: string; departmentId: string; departmentName: string
    employeeCount: number; avgScore: number; responseCount: number; totalRecipients: number; createdAt: Date
  }
  type PgrQuestionResultRow = {
    id: string; pgrReviewId: string; departmentId: string; questionId: string
    questionText: string; questionOrder: number; scoreDirection: string; avgScore: number; responseCount: number; createdAt: Date
  }

  const pgrPeriods = [
    { period: "2024-09", reviewedAt: new Date("2024-09-30"), nextReviewAt: new Date("2025-03-31"), weekApprox: 26 },
    { period: "2025-03", reviewedAt: new Date("2025-03-31"), nextReviewAt: new Date("2025-09-30"), weekApprox: 52 },
    { period: "2025-09", reviewedAt: new Date("2025-09-30"), nextReviewAt: new Date("2026-03-31"), weekApprox: 78 },
    { period: "2025-12", reviewedAt: new Date("2025-12-31"), nextReviewAt: new Date("2026-06-30"), weekApprox: 91 },
    { period: "2026-03", reviewedAt: new Date("2026-03-31"), nextReviewAt: new Date("2026-09-30"), weekApprox: 104 },
  ]

  for (const pgr of pgrPeriods) {
    const pgrId = randomUUID()
    await prisma.pgrReview.create({
      data: { id: pgrId, tenantId, period: pgr.period, status: "completed", reviewedAt: pgr.reviewedAt, nextReviewAt: pgr.nextReviewAt, createdAt: pgr.reviewedAt },
    })

    const deptResultRows: PgrDeptResultRow[] = []
    const questionResultRows: PgrQuestionResultRow[] = []

    for (const deptProfile of DEPT_PROFILES) {
      if (deptProfile.startWeek > pgr.weekApprox) continue
      const deptId = deptMap[deptProfile.deptName]
      if (!deptId) continue

      const avgScore = clamp(deptProfile.baseScore(Math.max(deptProfile.startWeek, pgr.weekApprox - 4)))
      const responseCount = Math.round(deptProfile.employeeCount * 0.82)

      deptResultRows.push({
        id: randomUUID(), pgrReviewId: pgrId, departmentId: deptId,
        departmentName: deptProfile.deptName, employeeCount: deptProfile.employeeCount,
        avgScore, responseCount, totalRecipients: deptProfile.employeeCount,
        createdAt: pgr.reviewedAt,
      })

      for (let qi = 0; qi < globalQIds.length; qi++) {
        const qId = globalQIds[qi]
        const bankQ = QUESTION_BANKS.default[qi]
        if (!qId || !bankQ) continue
        questionResultRows.push({
          id: randomUUID(), pgrReviewId: pgrId, departmentId: deptId, questionId: qId,
          questionText: bankQ.text, questionOrder: qi + 1, scoreDirection: bankQ.direction,
          avgScore: clamp(avgScore + (Math.random() - 0.5) * 0.6),
          responseCount, createdAt: pgr.reviewedAt,
        })
      }
    }

    await prisma.pgrDeptResult.createMany({ data: deptResultRows })
    await prisma.pgrQuestionResult.createMany({ data: questionResultRows })
  }
  logger.info("✅ Revisões PGR criadas (5 períodos).")

  logger.info("🌡️  Criando Pesquisa de Clima Organizacional...")
  const climateQuestionsSeed = [
    { text: "Você está satisfeito com o ambiente de trabalho?", dimension: "job_satisfaction" },
    { text: "Você se sente motivado nas atividades que realiza?", dimension: "job_satisfaction" },
    { text: "Você recomendaria a empresa como um bom lugar para trabalhar?", dimension: "job_satisfaction" },
    { text: "Você se sente bem informado sobre mudanças importantes?", dimension: "internal_communication" },
    { text: "Os canais de comunicação são eficazes?", dimension: "internal_communication" },
    { text: "A comunicação aumenta seu senso de pertencimento?", dimension: "internal_communication" },
    { text: "Você recebe apoio dos colegas?", dimension: "relationships" },
    { text: "Existe respeito entre os colaboradores?", dimension: "relationships" },
    { text: "Você confia nos superiores para resolver conflitos?", dimension: "relationships" },
    { text: "Você se sente valorizado pela liderança?", dimension: "recognition_reward" },
    { text: "Seus esforços são reconhecidos além do financeiro?", dimension: "recognition_reward" },
    { text: "Você está satisfeito com os benefícios?", dimension: "recognition_reward" },
    { text: "Existem oportunidades de crescimento?", dimension: "professional_development" },
    { text: "Você entende os critérios de promoção?", dimension: "professional_development" },
    { text: "Os gestores apoiam seu desenvolvimento?", dimension: "professional_development" },
    { text: "Você consegue equilibrar vida pessoal e trabalho?", dimension: "work_life_balance" },
    { text: "Tem flexibilidade suficiente?", dimension: "work_life_balance" },
    { text: "A empresa apoia saúde mental e física?", dimension: "work_life_balance" },
    { text: "Você se identifica com os valores da empresa?", dimension: "organizational_culture" },
    { text: "Existe colaboração entre equipes?", dimension: "organizational_culture" },
    { text: "O ambiente é respeitoso e inclusivo?", dimension: "organizational_culture" },
    { text: "Você confia nas decisões da liderança?", dimension: "leadership_trust" },
    { text: "A liderança se preocupa com o bem-estar das pessoas?", dimension: "leadership_trust" },
    { text: "A liderança inspira e motiva?", dimension: "leadership_trust" },
  ]

  const climateConfig = await prisma.climateSurveyConfiguration.create({
    data: {
      id: randomUUID(),
      tenantId,
      name: "Pesquisa de Clima Organizacional",
      description: "Avaliação trimestral de clima por tópicos",
      frequency: "quarterly",
      dispatchTime: "10:00",
      tokenExpiryHours: 96,
      sendViaMessaging: true,
      sendViaSignedLink: true,
      isActive: true,
      createdAt: addDays(NOW, -40),
    },
  })

  await prisma.climateSurveyConfigDepartment.createMany({
    data: Object.values(deptMap).map((departmentId) => ({
      configId: climateConfig.id,
      departmentId,
    })),
  })

  await prisma.climateSurveyConfigWorkDay.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ configId: climateConfig.id, dayOfWeek })),
  })

  const climateQuestionIds: string[] = []
  for (let i = 0; i < climateQuestionsSeed.length; i += 1) {
    const q = climateQuestionsSeed[i]
    if (!q) continue
    const created = await prisma.climateSurveyQuestion.create({
      data: {
        id: randomUUID(),
        tenantId,
        climateSurveyConfigurationId: climateConfig.id,
        text: q.text,
        order: i + 1,
        scoreDirection: "higher_is_better",
        dimension: q.dimension,
        isActive: true,
      },
    })
    climateQuestionIds.push(created.id)
  }

  const climateWaveDates = [addDays(NOW, -35), addDays(NOW, -7)]
  let climateResponseCount = 0

  for (const waveDate of climateWaveDates) {
    const climateDispatchId = randomUUID()
    await prisma.climateSurveyDispatch.create({
      data: {
        id: climateDispatchId,
        tenantId,
        climateSurveyConfigurationId: climateConfig.id,
        scheduledAt: waveDate,
        dispatchedAt: waveDate,
        adherenceCheckedAt: addDays(waveDate, 2),
        status: "available",
        source: "manual",
        signedLinkToken: randomUUID(),
        createdAt: waveDate,
      },
    })

    for (const deptProfile of DEPT_PROFILES) {
      const deptId = deptMap[deptProfile.deptName]
      const empIds = employeeMap[deptProfile.deptName] ?? []
      if (!deptId || empIds.length === 0) continue

      const respondentCount = Math.max(5, Math.round(empIds.length * 0.75))
      const respondents = empIds.slice(0, Math.min(respondentCount, empIds.length))

      await prisma.climateSurveyDeptDispatch.create({
        data: {
          id: randomUUID(),
          dispatchId: climateDispatchId,
          departmentId: deptId,
          totalRecipients: empIds.length,
          totalResponses: respondents.length,
        },
      })

      for (const empId of respondents) {
        const tokenId = randomUUID()
        const responseId = randomUUID()
        const usedAt = addHours(waveDate, rand(1, 8))
        const shortCode = String(rand(1000000, 9999999))

        await prisma.climateSurveyResponseToken.create({
          data: {
            id: tokenId,
            tenantId,
            dispatchId: climateDispatchId,
            employeeId: empId,
            token: randomUUID(),
            shortCode,
            expiresAt: addDays(waveDate, 4),
            workStartTime: deptProfile.workStartTime,
            workEndTime: deptProfile.workEndTime,
            usedAt,
            createdAt: waveDate,
          },
        })

        await prisma.climateSurveyResponse.create({
          data: {
            id: responseId,
            tenantId,
            dispatchId: climateDispatchId,
            departmentId: deptId,
            createdAt: setMinutes(setHours(usedAt, 0), 0),
          },
        })
        climateResponseCount += 1

        await prisma.climateSurveyResponseItem.createMany({
          data: climateQuestionIds.map((questionId) => ({
            id: randomUUID(),
            climateSurveyResponseId: responseId,
            questionId,
            score: clamp(Math.round(3.5 + (Math.random() - 0.35) * 2)),
          })),
        })
      }
    }

    await prisma.climateSurveyAnalyticsEvent.create({
      data: {
        id: randomUUID(),
        tenantId,
        event: "campanha_disparada",
        configId: climateConfig.id,
        dispatchId: climateDispatchId,
        quantity: 1,
        createdAt: waveDate,
      },
    })
  }

  await prisma.climateSurveyAnalyticsEvent.create({
    data: {
      id: randomUUID(),
      tenantId,
      event: "pesquisa_criada",
      configId: climateConfig.id,
      quantity: 1,
      createdAt: climateConfig.createdAt,
    },
  })

  logger.info(`✅ Clima: 1 config, ${climateQuestionsSeed.length} perguntas, 2 ondas, ${climateResponseCount} respostas.`)

  await prisma.$disconnect()

  logger.info("")
  logger.info("🎉 Seed de demo concluído com sucesso!")
  logger.info("")
  logger.info("  Organização:  Demo (slug: demo)")
  logger.info(`  Admin:        ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  logger.info(`  RH:           ${RH_EMAIL} / ${RH_PASSWORD}`)
  logger.info("")
  logger.info("  Departamentos:  7 (Tecnologia, Comercial, RH, Financeiro, Operações, Marketing + Suporte [mês 14])")
  logger.info("  Colaboradores:  46")
  logger.info("  Configuração:   1 (Pesquisa de Saúde Ocupacional — semanal, todos os setores)")
  logger.info("  Clima:          1 config + 2 ondas com respostas")
  logger.info(`  Dispatches:     ${allDispatches.length}`)
  logger.info(`  Respostas:      ${allResponses.length}`)
  logger.info(`  Itens de resp:  ${allItems.length}`)
  logger.info(`  Alertas:        ${alertsToCreate.length}`)
  logger.info("  Planos de ação: 6")
  logger.info("  Sugestões:      5")
  logger.info("  Documentos:     10")
  logger.info("  Relatos anôn.:  12")
  logger.info("  Revisões PGR:   5 (set/2024 → mar/2026)")
}

main().catch((e) => {
  logger.error(e)
  process.exit(1)
})
