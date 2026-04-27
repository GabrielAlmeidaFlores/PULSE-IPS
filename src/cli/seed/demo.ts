import "dotenv/config"
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
  setHours,
  setMinutes,
} from "date-fns"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const ORG_SLUG_OLD = "kyber-solucoes"
const ORG_SLUG_NEW = "demo"
const ORG_NAME_NEW = "Demo Indústria e Comércio Ltda."

const ADMIN_EMAIL = "admin@demo.com"
const ADMIN_PASSWORD = "Testando123!"
const RH_EMAIL = "rh@demo.com"
const RH_PASSWORD = "Testando123!"

const NOW = new Date("2026-04-23T10:00:00Z")
const ONE_YEAR_AGO = subMonths(NOW, 12)
const TOTAL_WEEKS = 52

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v: number, lo = 1, hi = 5): number {
  return Math.max(lo, Math.min(hi, v))
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

function noise(amp: number): number {
  return (Math.random() - 0.5) * 2 * amp
}

function cpfHash(cpf: string): string {
  return createHash("sha256").update(cpf).digest("hex")
}

// Five questions: [energia, carga_trabalho, relacionamento, reconhecimento, satisfacao]
type QBiases = [number, number, number, number, number]

interface DeptProfile {
  name: string
  employeeCount: number
  frequency: "weekly" | "biweekly"
  baseScore: (w: number) => number
  questionBiases: (w: number) => QBiases
  adherenceRate: (w: number) => number
  workDays: number[]
}

// questionBiases: additive offsets per question [energia, carga_trabalho, relacionamento, reconhecimento, satisfacao]
// These produce meaningfully different per-question averages within each dept
const DEPT_PROFILES: DeptProfile[] = [
  {
    name: "Tecnologia",
    employeeCount: 10,
    frequency: "weekly",
    baseScore: (w) => {
      if (w < 16) return 4.1 + noise(0.25)   // bom início de ano
      if (w < 29) return 2.9 + noise(0.45)   // crise: lançamento de produto com sprints insanas
      if (w < 37) return 3.5 + noise(0.35)   // recuperação após intervenção
      return 3.9 + noise(0.25)               // normalização e estabilidade
    },
    questionBiases: (w): QBiases => {
      if (w >= 16 && w < 29) return [-0.3, -1.2, +0.1, -0.8, -0.6]  // crise: energia e reconhecimento caem
      if (w >= 29 && w < 37) return [-0.1, -0.4, +0.2, -0.2, -0.1]  // recuperação gradual
      return [+0.2, -0.1, +0.4, +0.1, +0.2]                          // bom: relacionamento é o ponto forte
    },
    adherenceRate: (w) => clamp(w >= 16 && w < 29 ? 0.64 + noise(0.06) : 0.88 + noise(0.05), 0.3, 1),
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Comercial",
    employeeCount: 8,
    frequency: "weekly",
    baseScore: (w) => {
      if (w >= 39) return 3.1 + noise(0.35)   // Q4: pressão de fechamento de ano
      if (w < 13)  return 3.4 + noise(0.35)   // Q1: início lento, pipeline fraco
      return 3.9 + noise(0.28)                 // Q2/Q3: bom ritmo de vendas
    },
    questionBiases: (w): QBiases => {
      if (w >= 39) return [-0.1, -1.0, +0.2, -0.4, -0.5]   // Q4: carga explode, satisfação cai
      if (w < 13)  return [+0.0, -0.6, +0.3, -0.1, -0.2]   // Q1: carga moderada, relacionamento ok
      return [+0.3, -0.1, +0.5, +0.2, +0.3]                 // meio do ano: relacionamento e energia ótimos
    },
    adherenceRate: (w) => clamp(w >= 39 ? 0.77 + noise(0.08) : 0.91 + noise(0.05), 0.3, 1),
    workDays: [1, 2, 3, 4, 5, 6],
  },
  {
    name: "Recursos Humanos",
    employeeCount: 5,
    frequency: "biweekly",
    baseScore: (_w) => 4.3 + noise(0.28),
    questionBiases: (_w): QBiases => [+0.4, +0.1, +0.6, +0.3, +0.4],  // líderes em tudo: energia, relacionamento, satisfação
    adherenceRate: (_w) => clamp(0.94 + noise(0.04), 0.3, 1),
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Financeiro",
    employeeCount: 7,
    frequency: "weekly",
    baseScore: (w) => clamp(3.8 - w * 0.030 + noise(0.28)),  // declínio constante ao longo do ano
    questionBiases: (w): QBiases => {
      const severity = Math.min(w / 52, 1)
      return [
        -0.1,
        -0.6 - severity * 0.7,   // carga de trabalho piora progressivamente
        +0.1,
        -0.5 - severity * 0.5,   // reconhecimento em colapso
        -0.3 - severity * 0.4,   // satisfação deteriora
      ]
    },
    adherenceRate: (w) => clamp(0.83 - w * 0.004 + noise(0.07), 0.38, 0.93),
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Operações",
    employeeCount: 12,
    frequency: "weekly",
    baseScore: (w) => {
      if (w >= 28 && w < 38) return 3.1 + noise(0.38)   // breve melhora após intervenção Q3/2025
      return 2.6 + noise(0.38)                            // crônico: pior setor da empresa
    },
    questionBiases: (w): QBiases => {
      if (w >= 28 && w < 38) return [-0.1, -0.5, +0.3, -0.3, -0.1]   // intervenção ajuda, carga ainda alta
      return [-0.2, -1.1, -0.1, -0.8, -0.5]                           // crônico: carga e reconhecimento críticos
    },
    adherenceRate: (w) => clamp(w >= 28 && w < 38 ? 0.72 + noise(0.08) : 0.57 + noise(0.10), 0.3, 1),
    workDays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    name: "Marketing",
    employeeCount: 6,
    frequency: "biweekly",
    baseScore: (w) => clamp(3.6 + Math.sin((w / 52) * Math.PI * 2.5) * 0.9 + noise(0.28)),
    questionBiases: (w): QBiases => {
      const campaign = Math.sin((w / 52) * Math.PI * 2.5) > 0.3
      return campaign
        ? [+0.2, -0.5, +0.4, +0.1, +0.1]   // campanha: carga alta mas energia e relacionamento bons
        : [-0.1, -0.2, +0.5, -0.1, 0.0]     // fora de campanha: tranquilo, relacionamento ótimo
    },
    adherenceRate: (_w) => clamp(0.79 + noise(0.12), 0.3, 1),
    workDays: [1, 2, 3, 4, 5],
  },
  {
    name: "Suporte ao Cliente",
    employeeCount: 8,
    frequency: "weekly",
    baseScore: (w) => {
      if (w >= 20 && w < 32) return 2.8 + noise(0.38)   // pico de volume: maio-agosto
      return 3.2 + noise(0.30)
    },
    questionBiases: (w): QBiases => {
      if (w >= 20 && w < 32) return [-0.6, -0.7, +0.4, -0.4, -0.5]   // esgotamento emocional no pico
      return [-0.3, -0.4, +0.6, -0.1, -0.1]                           // cansativo mas equipe é muito unida
    },
    adherenceRate: (w) => clamp(w >= 20 && w < 32 ? 0.67 + noise(0.08) : 0.82 + noise(0.06), 0.3, 1),
    workDays: [1, 2, 3, 4, 5, 6],
  },
]

const QUESTIONS = [
  { text: "Como você avalia seu nível de energia e disposição para trabalhar esta semana?", direction: "higher_is_better" },
  { text: "Você sente que sua carga de trabalho está equilibrada e gerenciável?", direction: "higher_is_better" },
  { text: "Como está a qualidade do relacionamento com sua equipe e liderança?", direction: "higher_is_better" },
  { text: "Você se sente reconhecido(a) e valorizado(a) pelo seu trabalho?", direction: "higher_is_better" },
  { text: "Qual é o seu nível de satisfação geral com o ambiente de trabalho?", direction: "higher_is_better" },
]

const DOCUMENT_TEMPLATES = [
  { title: "Programa de Gerenciamento de Riscos (PGR) — 2025", type: "pgr" },
  { title: "Programa de Controle Médico de Saúde Ocupacional (PCMSO) — 2025", type: "pcmso" },
  { title: "Manual de Segurança e Saúde Ocupacional", type: "manual" },
  { title: "Laudo Ergonômico — Operações (outubro/2025)", type: "laudo" },
  { title: "Plano de Ação Corretiva — Operações Q3/2025", type: "action_plan" },
  { title: "Relatório de Incidentes — Setembro 2025", type: "report" },
  { title: "Política de Bem-Estar e Saúde Mental", type: "policy" },
  { title: "Treinamento: Riscos Psicossociais no Trabalho", type: "training" },
  { title: "Ata de Reunião CIPA — Novembro 2025", type: "meeting_minutes" },
  { title: "DDS — Saúde Mental no Trabalho (dezembro/2025)", type: "dds" },
]

interface ReportTemplate {
  content: string
  category: string
  status: string
  dept: string
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    content: "Estou sentindo uma pressão muito grande para entregar resultados impossíveis em prazos irreais. Isso está afetando meu sono e minha saúde mental de forma grave.",
    category: "overload",
    status: "resolved",
    dept: "Tecnologia",
  },
  {
    content: "Há um colega que faz comentários inapropriados e cria um ambiente hostil. Já aconteceu mais de uma vez e a liderança não toma atitude.",
    category: "harassment",
    status: "analyzing",
    dept: "Operações",
  },
  {
    content: "As cadeiras e mesas na área de operações estão causando dores nas costas. Precisamos urgentemente de uma avaliação ergonômica.",
    category: "physical_environment",
    status: "resolved",
    dept: "Operações",
  },
  {
    content: "Existe um conflito sério entre dois líderes da área que está criando um clima de tensão e afetando toda a equipe.",
    category: "conflict",
    status: "open",
    dept: "Comercial",
  },
  {
    content: "O volume de horas extras no setor é insustentável. Trabalho mais de 50 horas por semana há meses e não há perspectiva de melhora.",
    category: "overload",
    status: "analyzing",
    dept: "Financeiro",
  },
  {
    content: "Sinto que meu trabalho não é reconhecido pela liderança. Faço muito e nunca recebo nenhum feedback positivo ou reconhecimento.",
    category: "other",
    status: "open",
    dept: "Financeiro",
  },
  {
    content: "A iluminação da área é precária e estou com problemas de visão. Já reclamei internamente mas nada foi feito.",
    category: "physical_environment",
    status: "resolved",
    dept: "Operações",
  },
  {
    content: "O processo de onboarding para novos clientes está gerando uma sobrecarga enorme no time. Atendemos até 80 chamados por dia.",
    category: "overload",
    status: "open",
    dept: "Suporte ao Cliente",
  },
  {
    content: "Recebi uma ofensa grave de um cliente e a liderança disse que eu precisava ter mais paciência. Isso não é aceitável.",
    category: "harassment",
    status: "analyzing",
    dept: "Suporte ao Cliente",
  },
  {
    content: "Conflito de liderança entre dois gestores está gerando ordens contraditórias para a equipe. Não sabemos mais quem ouvir.",
    category: "conflict",
    status: "resolved",
    dept: "Marketing",
  },
  {
    content: "As metas comerciais para o último trimestre são completamente desconectadas da realidade de mercado. Toda a equipe está sob estresse extremo.",
    category: "overload",
    status: "analyzing",
    dept: "Comercial",
  },
  {
    content: "Me sinto muito ansioso com a instabilidade que percebo na empresa. Falta comunicação transparente da liderança sobre os rumos da organização.",
    category: "other",
    status: "open",
    dept: "Tecnologia",
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
    { name: "Victor Almeida", phone: "+5511911110009", email: "victor.almeida@demo.com" },
    { name: "Camila Martins", phone: "+5511911110010", email: "camila.martins@demo.com" },
  ],
  Comercial: [
    { name: "Mariana Borges", phone: "+5511911110011", email: "mariana.borges@demo.com" },
    { name: "Felipe Santos", phone: "+5511911110012", email: "felipe.santos@demo.com" },
    { name: "Juliana Melo", phone: "+5511911110013", email: "juliana.melo@demo.com" },
    { name: "André Vieira", phone: "+5511911110014", email: "andre.vieira@demo.com" },
    { name: "Patricia Carvalho", phone: "+5511911110015", email: "patricia.carvalho@demo.com" },
    { name: "Ricardo Pinto", phone: "+5511911110016", email: "ricardo.pinto@demo.com" },
    { name: "Camila Torres", phone: "+5511911110017", email: "camila.torres@demo.com" },
    { name: "Eduardo Matos", phone: "+5511911110018", email: "eduardo.matos@demo.com" },
  ],
  "Recursos Humanos": [
    { name: "Vanessa Monteiro", phone: "+5511911110019", email: "vanessa.monteiro@demo.com" },
    { name: "Eduardo Figueiredo", phone: "+5511911110020", email: "eduardo.figueiredo@demo.com" },
    { name: "Larissa Barbosa", phone: "+5511911110021", email: "larissa.barbosa@demo.com" },
    { name: "Gustavo Leal", phone: "+5511911110022", email: "gustavo.leal@demo.com" },
    { name: "Isabela Macedo", phone: "+5511911110023", email: "isabela.macedo@demo.com" },
  ],
  Financeiro: [
    { name: "Roberto Assis", phone: "+5511911110024", email: "roberto.assis@demo.com" },
    { name: "Tatiana Corrêa", phone: "+5511911110025", email: "tatiana.correa@demo.com" },
    { name: "Alexandre Cunha", phone: "+5511911110026", email: "alexandre.cunha@demo.com" },
    { name: "Priscila Ramos", phone: "+5511911110027", email: "priscila.ramos@demo.com" },
    { name: "Bruno Cavalcante", phone: "+5511911110028", email: "bruno.cavalcante@demo.com" },
    { name: "Michele Freitas", phone: "+5511911110029", email: "michele.freitas@demo.com" },
    { name: "Nelson Barbosa", phone: "+5511911110030", email: "nelson.barbosa@demo.com" },
  ],
  Operações: [
    { name: "Jonas Teixeira", phone: "+5511911110031", email: "jonas.teixeira@demo.com" },
    { name: "Simone Andrade", phone: "+5511911110032", email: "simone.andrade@demo.com" },
    { name: "Mauro Rodrigues", phone: "+5511911110033", email: "mauro.rodrigues@demo.com" },
    { name: "Cristiane Peixoto", phone: "+5511911110034", email: "cristiane.peixoto@demo.com" },
    { name: "Leandro Moura", phone: "+5511911110035", email: "leandro.moura@demo.com" },
    { name: "Aline Nascimento", phone: "+5511911110036", email: "aline.nascimento@demo.com" },
    { name: "Paulo Siqueira", phone: "+5511911110037", email: "paulo.siqueira@demo.com" },
    { name: "Renata Campos", phone: "+5511911110038", email: "renata.campos@demo.com" },
    { name: "Sérgio Batista", phone: "+5511911110039", email: "sergio.batista@demo.com" },
    { name: "Cláudia Ferraz", phone: "+5511911110040", email: "claudia.ferraz@demo.com" },
    { name: "Wellington Cruz", phone: "+5511911110041", email: "wellington.cruz@demo.com" },
    { name: "Rosana Lima", phone: "+5511911110042", email: "rosana.lima@demo.com" },
  ],
  Marketing: [
    { name: "Natalia Duarte", phone: "+5511911110043", email: "natalia.duarte@demo.com" },
    { name: "Hugo Marques", phone: "+5511911110044", email: "hugo.marques@demo.com" },
    { name: "Gabriela Pereira", phone: "+5511911110045", email: "gabriela.pereira@demo.com" },
    { name: "Daniel Nogueira", phone: "+5511911110046", email: "daniel.nogueira@demo.com" },
    { name: "Amanda Xavier", phone: "+5511911110047", email: "amanda.xavier@demo.com" },
    { name: "Leonardo Fonseca", phone: "+5511911110048", email: "leonardo.fonseca@demo.com" },
  ],
  "Suporte ao Cliente": [
    { name: "Fernanda Oliveira", phone: "+5511911110049", email: "fernanda.oliveira@demo.com" },
    { name: "Carlos Mendonça", phone: "+5511911110050", email: "carlos.mendonca@demo.com" },
    { name: "Patricia Sousa", phone: "+5511911110051", email: "patricia.sousa@demo.com" },
    { name: "Roberto Braga", phone: "+5511911110052", email: "roberto.braga@demo.com" },
    { name: "Marcia Ferreira", phone: "+5511911110053", email: "marcia.ferreira@demo.com" },
    { name: "Tiago Albuquerque", phone: "+5511911110054", email: "tiago.albuquerque@demo.com" },
    { name: "Sandra Rodrigues", phone: "+5511911110055", email: "sandra.rodrigues@demo.com" },
    { name: "Fábio Cardoso", phone: "+5511911110056", email: "fabio.cardoso@demo.com" },
  ],
}

interface AlertToCreate {
  tenantId: string
  departmentId: string
  type: string
  severity: string
  message: string
  isRead: boolean
  resolvedAt: Date | null
  createdAt: Date
}

async function main(): Promise<void> {
  console.log("🚀 Iniciando seed de demo (versão aprimorada)...")

  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug: ORG_SLUG_OLD }, { slug: ORG_SLUG_NEW }] },
  })
  if (!org) {
    console.error(`❌ Organização não encontrada. Execute o seed principal primeiro.`)
    process.exit(1)
  }

  const tenantId = org.id
  console.log(`✅ Org encontrada: ${org.name} (${tenantId})`)

  console.log("🗑️  Limpando dados antigos...")
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
  await prisma.actionPlanSuggestion.deleteMany({ where: { tenantId } })
  await prisma.actionPlan.deleteMany({ where: { tenantId } })
  await prisma.document.deleteMany({ where: { tenantId } })
  await prisma.alert.deleteMany({ where: { tenantId } })
  await prisma.department.deleteMany({ where: { tenantId } })
  await prisma.platformTermsAcceptance.deleteMany({ where: { user: { tenantId } } })
  await prisma.auditLog.deleteMany({ where: { tenantId } })
  await prisma.messageLog.deleteMany({ where: { tenantId } })
  await prisma.organizationUser.deleteMany({ where: { tenantId } })
  console.log("✅ Dados limpos.")

  const consentTermVersion = await prisma.consentTermVersion.findFirst({ where: { isActive: true } })
  if (!consentTermVersion) throw new Error("Nenhuma versão de TCLE ativa encontrada.")
  const platformTermsVersion = await prisma.platformTermsVersion.findFirst({ where: { isActive: true } })
  if (!platformTermsVersion) throw new Error("Nenhuma versão de Termos da Plataforma ativa encontrada.")

  console.log("👤 Criando usuários...")
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const rhPasswordHash = await bcrypt.hash(RH_PASSWORD, 10)

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

  console.log(`✅ Usuários: ${ADMIN_EMAIL}, ${RH_EMAIL}`)

  console.log("🏢 Criando departamentos, colaboradores e configurações...")
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
    for (let ei = 0; ei < deptEmployees.length; ei++) {
      const emp = deptEmployees[ei]
      if (!emp) continue
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
          cpfHash: cpfHash(`000.000.000-${(ei + 1).toString().padStart(2, "0")}`),
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
        frequency: profile.frequency,
        workStartTime: "09:00",
        workEndTime: "18:00",
        isActive: true,
      },
    })
    configMap[profile.name] = config.id

    await prisma.surveyConfigWorkDay.createMany({
      data: profile.workDays.map((d) => ({ configId: config.id, dayOfWeek: d })),
    })

    const qIds: string[] = []
    for (let qi = 0; qi < QUESTIONS.length; qi++) {
      const q = QUESTIONS[qi]
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

  console.log("✅ Departamentos e colaboradores criados.")

  console.log("📊 Gerando 1 ano de pesquisas com scores variados por setor e pergunta...")

  const alertsToCreate: AlertToCreate[] = []

  for (const profile of DEPT_PROFILES) {
    const deptId = deptMap[profile.name]
    const configId = configMap[profile.name]
    const qIds = questionMap[profile.name] ?? []
    const empIds = employeeMap[profile.name] ?? []
    if (!deptId || !configId || qIds.length === 0 || empIds.length === 0) continue

    const dispatchIntervalWeeks = profile.frequency === "weekly" ? 1 : 2
    let weekIndex = 0
    let prevAvgScore: number | null = null
    let belowAvgStreak = 0

    while (weekIndex < TOTAL_WEEKS) {
      const dispatchDate = setMinutes(setHours(addWeeks(ONE_YEAR_AGO, weekIndex), 9), 0)
      const baseScore = profile.baseScore(weekIndex)
      const adherence = profile.adherenceRate(weekIndex)
      const respondentCount = Math.max(5, Math.min(Math.round(empIds.length * adherence), empIds.length))
      const respondents = empIds.slice(0, respondentCount)
      const biases = profile.questionBiases(weekIndex)

      const dispatch = await prisma.surveyDispatch.create({
        data: {
          id: randomUUID(),
          tenantId,
          surveyConfigurationId: configId,
          scheduledAt: dispatchDate,
          dispatchedAt: dispatchDate,
          adherenceCheckedAt: addDays(dispatchDate, 2),
          status: "sent",
          totalRecipients: empIds.length,
          totalResponses: respondents.length,
        },
      })

      // Batch inserts for performance
      const tokenBatch: {
        id: string; tenantId: string; dispatchId: string; employeeId: string
        token: string; expiresAt: Date; usedAt: Date; workStartTime: string
        workEndTime: string; createdAt: Date
      }[] = []
      const responseBatch: {
        id: string; tenantId: string; dispatchId: string; tokenId: string; createdAt: Date
      }[] = []
      const itemBatch: {
        id: string; surveyResponseId: string; questionId: string; score: number
      }[] = []

      const weekScores: number[] = []

      for (const empId of respondents) {
        const tokenId = randomUUID()
        const responseId = randomUUID()
        const usedAt = addHours(dispatchDate, rand(1, 8))

        // Float-based employee base (not pre-rounded) for more precise per-question averages
        const empBase = baseScore + noise(0.5)

        tokenBatch.push({
          id: tokenId, tenantId, dispatchId: dispatch.id, employeeId: empId,
          token: randomUUID(), expiresAt: addDays(dispatchDate, 2), usedAt,
          workStartTime: "09:00", workEndTime: "18:00", createdAt: dispatchDate,
        })
        responseBatch.push({
          id: responseId, tenantId, dispatchId: dispatch.id, tokenId, createdAt: usedAt,
        })

        // Per-question biases create visibly different scores across the 5 questions
        for (let qi = 0; qi < qIds.length; qi++) {
          const qId = qIds[qi]
          if (!qId) continue
          const qBias = biases[qi] ?? 0
          const score = clamp(Math.round(empBase + qBias + noise(0.35)), 1, 5)
          itemBatch.push({ id: randomUUID(), surveyResponseId: responseId, questionId: qId, score })
        }

        const empAvg = biases.reduce((s, b) => s + b, 0) / biases.length + empBase
        weekScores.push(clamp(empAvg))
      }

      await prisma.surveyResponseToken.createMany({ data: tokenBatch })
      await prisma.surveyResponse.createMany({ data: responseBatch })
      await prisma.surveyResponseItem.createMany({ data: itemBatch })

      const avgScore =
        weekScores.length > 0 ? weekScores.reduce((a, b) => a + b, 0) / weekScores.length : baseScore

      // Alert: low adherence
      const adherenceActual = respondents.length / empIds.length
      if (adherenceActual < 0.60) {
        alertsToCreate.push({
          tenantId,
          departmentId: deptId,
          type: "low_adherence",
          severity: adherenceActual < 0.45 ? "critical" : "warning",
          message: `Baixa adesão em ${profile.name}: ${Math.round(adherenceActual * 100)}% de respostas (semana ${weekIndex + 1}).`,
          isRead: weekIndex < TOTAL_WEEKS - 8,
          resolvedAt: weekIndex < TOTAL_WEEKS - 8 ? addDays(dispatchDate, rand(3, 10)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      // Alert: score drop
      if (prevAvgScore !== null && prevAvgScore - avgScore > 0.85) {
        alertsToCreate.push({
          tenantId,
          departmentId: deptId,
          type: "score_drop",
          severity: prevAvgScore - avgScore > 1.3 ? "critical" : "warning",
          message: `Queda de score em ${profile.name}: de ${prevAvgScore.toFixed(1)} para ${avgScore.toFixed(1)}.`,
          isRead: weekIndex < TOTAL_WEEKS - 8,
          resolvedAt: weekIndex < TOTAL_WEEKS - 8 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      // Alert: negative trend (3 consecutive periods below benchmark)
      if (avgScore < 3.5) {
        belowAvgStreak++
        if (belowAvgStreak === 3) {
          alertsToCreate.push({
            tenantId,
            departmentId: deptId,
            type: "negative_trend",
            severity: avgScore < 3.0 ? "critical" : "warning",
            message: `Tendência negativa em ${profile.name}: 3 períodos consecutivos abaixo da média (score atual: ${avgScore.toFixed(1)}).`,
            isRead: weekIndex < TOTAL_WEEKS - 10,
            resolvedAt: weekIndex < TOTAL_WEEKS - 10 ? addDays(dispatchDate, rand(14, 30)) : null,
            createdAt: addDays(dispatchDate, 2),
          })
        }
      } else {
        belowAvgStreak = 0
      }

      prevAvgScore = avgScore
      weekIndex += dispatchIntervalWeeks
    }

    // Fixed narrative alerts per dept
    if (profile.name === "Financeiro") {
      alertsToCreate.push({
        tenantId,
        departmentId: deptId,
        type: "negative_trend",
        severity: "critical",
        message: `Tendência negativa crítica em Financeiro: score em queda contínua há mais de 3 meses. Score atual abaixo de 2.5. Intervenção urgente necessária.`,
        isRead: false,
        resolvedAt: null,
        createdAt: addWeeks(ONE_YEAR_AGO, 48),
      })
    }
    if (profile.name === "Operações") {
      alertsToCreate.push({
        tenantId,
        departmentId: deptId,
        type: "crisis_report",
        severity: "critical",
        message: `Indicadores críticos em Operações: score abaixo de 2.5, adesão inferior a 55% e múltiplos relatos de sobrecarga e assédio.`,
        isRead: false,
        resolvedAt: null,
        createdAt: addWeeks(ONE_YEAR_AGO, 50),
      })
    }
    if (profile.name === "Tecnologia") {
      const nextReviewDate = addDays(NOW, 28)
      alertsToCreate.push({
        tenantId,
        departmentId: deptId,
        type: "pgr_review_due",
        severity: "warning",
        message: `Revisão do PGR vence em ${format(nextReviewDate, "dd/MM/yyyy")}. Agende a revisão com sua equipe.`,
        isRead: false,
        resolvedAt: null,
        createdAt: addDays(NOW, -2),
      })
    }
    if (profile.name === "Suporte ao Cliente") {
      alertsToCreate.push({
        tenantId,
        departmentId: deptId,
        type: "score_drop",
        severity: "critical",
        message: `Queda acentuada em Suporte ao Cliente: energia e satisfação atingiram mínimo histórico durante pico de volume (maio-agosto).`,
        isRead: true,
        resolvedAt: addWeeks(ONE_YEAR_AGO, 34),
        createdAt: addWeeks(ONE_YEAR_AGO, 24),
      })
    }
  }

  console.log(`✅ Pesquisas geradas. Inserindo ${alertsToCreate.length} alertas...`)
  for (const alert of alertsToCreate) {
    await prisma.alert.create({ data: { id: randomUUID(), ...alert } })
  }

  console.log("📋 Criando planos de ação...")

  const plan1 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Reduzir sobrecarga e restaurar bem-estar — Tecnologia (concluído)",
      description:
        "Score caiu de 4.1 para 2.9 durante o lançamento do produto em maio/2025 (carga de trabalho e reconhecimento em colapso). Plano implementado com sucesso: sprints reformuladas, limite de horas extras, canal de feedback direto. Score atual: 3.9.",
      status: "completed",
      priority: "high",
      dueDate: addWeeks(ONE_YEAR_AGO, 36),
      completedAt: addWeeks(ONE_YEAR_AGO, 35),
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Implementar retrospectiva quinzenal de bem-estar da equipe", assigneeId: rhUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 22), completedAt: addWeeks(ONE_YEAR_AGO, 21) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Limitar horas extras a 4h por semana por colaborador", assigneeId: adminUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 24), completedAt: addWeeks(ONE_YEAR_AGO, 25) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Criar canal direto de feedback entre tech leads e equipe", assigneeId: rhUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 26), completedAt: addWeeks(ONE_YEAR_AGO, 27) },
      { id: randomUUID(), tenantId, actionPlanId: plan1.id, title: "Workshop de produtividade sustentável e gestão de energia", assigneeId: rhUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 30), completedAt: addWeeks(ONE_YEAR_AGO, 31) },
    ],
  })

  const plan2 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Reverter tendência negativa — Financeiro (urgente)",
      description:
        "Score do Financeiro em queda contínua há 6 meses (3.8 → 2.2). Carga de trabalho e reconhecimento em colapso. Plano de intervenção em andamento com foco em redistribuição de demandas e valorização da equipe.",
      status: "in_progress",
      priority: "high",
      dueDate: addDays(NOW, 45),
      completedAt: null,
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Realizar 1:1s individuais com todos os colaboradores de Financeiro", assigneeId: rhUser.id, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Revisão de metas e prazos de fechamento contábil com board", assigneeId: adminUser.id, dueDate: addDays(NOW, 14), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Implementar programa de reconhecimento mensal — top contributors", assigneeId: rhUser.id, dueDate: addDays(NOW, 21), completedAt: addDays(NOW, -5) },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Contratar 2 analistas para redistribuir carga do fechamento", assigneeId: adminUser.id, dueDate: addDays(NOW, 30), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan2.id, title: "Pesquisa qualitativa aprofundada com grupo voluntário", assigneeId: rhUser.id, dueDate: addDays(NOW, 10), completedAt: null },
    ],
  })

  const plan3 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Intervenção Q3/2025 — Operações (concluído com melhora parcial)",
      description:
        "Intervenção implementada em julho/2025 gerou melhora temporária (2.6 → 3.1). Avaliação ergonômica realizada, mediação de conflitos e revisão de escala. Melhora revertida em set/2025 — novo plano aberto.",
      status: "completed",
      priority: "high",
      dueDate: addWeeks(ONE_YEAR_AGO, 38),
      completedAt: addWeeks(ONE_YEAR_AGO, 40),
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Avaliação ergonômica do ambiente físico de Operações", assigneeId: rhUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 30), completedAt: addWeeks(ONE_YEAR_AGO, 29) },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Revisão da escala de turnos e banco de horas com a equipe", assigneeId: adminUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 32), completedAt: addWeeks(ONE_YEAR_AGO, 31) },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Sessão de escuta ativa e mediação de conflitos com lideranças", assigneeId: rhUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 33), completedAt: addWeeks(ONE_YEAR_AGO, 34) },
      { id: randomUUID(), tenantId, actionPlanId: plan3.id, title: "Treinamento de liderança humanizada para gestores de Ops", assigneeId: rhUser.id, dueDate: addWeeks(ONE_YEAR_AGO, 36), completedAt: addWeeks(ONE_YEAR_AGO, 37) },
    ],
  })

  const plan4 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Bem-estar contínuo — Operações (novo ciclo 2026)",
      description:
        "Com a regressão dos indicadores de Operações após set/2025, este plano busca mudanças estruturais permanentes. Foco em carga de trabalho sustentável, reconhecimento e liderança próxima.",
      status: "open",
      priority: "high",
      dueDate: addDays(NOW, 60),
      completedAt: null,
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Reunião de escuta ativa com toda a equipe de Operações", assigneeId: adminUser.id, dueDate: addDays(NOW, 5), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Revisão e implementação de escala mensal compartilhada", assigneeId: adminUser.id, dueDate: addDays(NOW, 10), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Processo de mediação para conflitos recorrentes na liderança", assigneeId: rhUser.id, dueDate: addDays(NOW, 14), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Check-in semanal presencial entre gestor e equipe", assigneeId: adminUser.id, dueDate: addDays(NOW, 21), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan4.id, title: "Implementar política de reconhecimento para Operações", assigneeId: rhUser.id, dueDate: addDays(NOW, 30), completedAt: null },
    ],
  })

  const plan5 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Gestão do esgotamento emocional — Suporte ao Cliente",
      description:
        "Pico de volume entre maio e agosto/2025 levou energia e satisfação ao mínimo histórico no setor. Apesar da equipe ser coesa (relacionamento alto), esgotamento emocional é crítico. Plano foca em resiliência e fluxo de trabalho.",
      status: "in_progress",
      priority: "medium",
      dueDate: addDays(NOW, 30),
      completedAt: null,
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan5.id, title: "Treinamento de resiliência emocional para atendentes", assigneeId: rhUser.id, dueDate: addDays(NOW, 7), completedAt: addDays(NOW, -3) },
      { id: randomUUID(), tenantId, actionPlanId: plan5.id, title: "Implementar política de pausas obrigatórias a cada 2h", assigneeId: adminUser.id, dueDate: addDays(NOW, 10), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan5.id, title: "Revisar SLA para reduzir pressão nos picos de volume", assigneeId: adminUser.id, dueDate: addDays(NOW, 21), completedAt: null },
    ],
  })

  const plan6 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId,
      title: "Bem-estar no fecho de ano — Comercial",
      description:
        "Q4 historicamente provoca queda de satisfação e carga elevada no Comercial. Plano preventivo para suavizar o impacto e manter a equipe engajada durante o período de maior pressão.",
      status: "open",
      priority: "medium",
      dueDate: addDays(NOW, 45),
      completedAt: null,
    },
  })

  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId, actionPlanId: plan6.id, title: "Workshop de gestão de metas realistas com liderança Comercial", assigneeId: adminUser.id, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan6.id, title: "Definir política de flexibilidade de horário em dez/jan", assigneeId: rhUser.id, dueDate: addDays(NOW, 14), completedAt: null },
      { id: randomUUID(), tenantId, actionPlanId: plan6.id, title: "Celebração de resultados: confraternização e reconhecimento", assigneeId: rhUser.id, dueDate: addDays(NOW, 30), completedAt: null },
    ],
  })

  console.log("✅ Planos de ação criados.")

  console.log("📄 Criando documentos...")
  for (const doc of DOCUMENT_TEMPLATES) {
    await prisma.document.create({
      data: {
        id: randomUUID(),
        tenantId,
        title: doc.title,
        type: doc.type,
        isActive: true,
      },
    })
  }
  console.log("✅ Documentos criados.")

  console.log("📢 Criando relatos anônimos...")
  for (const report of REPORT_TEMPLATES) {
    const deptId = deptMap[report.dept] ?? sample(Object.values(deptMap))
    const createdAt = addWeeks(ONE_YEAR_AGO, rand(4, 48))
    await prisma.anonymousReport.create({
      data: {
        id: randomUUID(),
        tenantId,
        orgSlug: ORG_SLUG_NEW,
        content: report.content,
        category: report.category,
        status: report.status,
        resolvedAt: report.status === "resolved" ? addDays(createdAt, rand(3, 14)) : null,
        createdAt,
      },
    })
  }
  console.log("✅ Relatos anônimos criados.")

  console.log("📋 Criando revisões PGR...")
  const pgrDepts = DEPT_PROFILES.map((p) => ({
    name: p.name,
    id: deptMap[p.name] ?? "",
    empCount: p.employeeCount,
  }))

  const pgrPeriods = [
    { period: "2025-06", reviewedAt: new Date("2025-06-30"), nextReviewAt: new Date("2025-12-31") },
    { period: "2025-12", reviewedAt: new Date("2025-12-31"), nextReviewAt: new Date("2026-06-30") },
    { period: "2026-03", reviewedAt: new Date("2026-03-31"), nextReviewAt: new Date("2026-09-30") },
  ]

  for (const pgr of pgrPeriods) {
    const pgrRecord = await prisma.pgrReview.create({
      data: {
        id: randomUUID(),
        tenantId,
        period: pgr.period,
        status: "completed",
        reviewedAt: pgr.reviewedAt,
        nextReviewAt: pgr.nextReviewAt,
        createdAt: pgr.reviewedAt,
      },
    })

    for (const dept of pgrDepts) {
      if (!dept.id) continue
      const weekOfPgr = Math.round(
        (pgr.reviewedAt.getTime() - ONE_YEAR_AGO.getTime()) / (7 * 24 * 3600 * 1000)
      )
      const profile = DEPT_PROFILES.find((p) => p.name === dept.name)
      const baseScore = profile ? clamp(profile.baseScore(Math.max(0, weekOfPgr))) : 3.5
      const biases = profile ? profile.questionBiases(Math.max(0, weekOfPgr)) : ([0, 0, 0, 0, 0] as QBiases)

      const deptResult = await prisma.pgrDeptResult.create({
        data: {
          id: randomUUID(),
          pgrReviewId: pgrRecord.id,
          departmentId: dept.id,
          departmentName: dept.name,
          employeeCount: dept.empCount,
          avgScore: baseScore,
          responseCount: Math.round(dept.empCount * 0.82),
          totalRecipients: dept.empCount,
          createdAt: pgr.reviewedAt,
        },
      })

      const qIds = questionMap[dept.name] ?? []
      for (let qi = 0; qi < qIds.length; qi++) {
        const qId = qIds[qi]
        if (!qId) continue
        const qBias = biases[qi] ?? 0
        await prisma.pgrQuestionResult.create({
          data: {
            id: randomUUID(),
            pgrReviewId: pgrRecord.id,
            departmentId: dept.id,
            questionId: qId,
            questionText: QUESTIONS[qi]?.text ?? `Pergunta ${qi + 1}`,
            questionOrder: qi + 1,
            scoreDirection: "higher_is_better",
            avgScore: clamp(baseScore + qBias + noise(0.15)),
            responseCount: deptResult.responseCount,
            createdAt: pgr.reviewedAt,
          },
        })
      }
    }
  }

  console.log("✅ Revisões PGR criadas.")

  await prisma.$disconnect()

  const totalEmps = DEPT_PROFILES.reduce((s, p) => s + p.employeeCount, 0)
  console.log("")
  console.log("🎉 Seed de demo concluído com sucesso!")
  console.log("")
  console.log(`  Organização:      ${ORG_NAME_NEW} (slug: ${ORG_SLUG_NEW})`)
  console.log(`  Admin:            ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log(`  RH:               ${RH_EMAIL} / ${RH_PASSWORD}`)
  console.log("")
  console.log(`  Departamentos:    ${DEPT_PROFILES.length} (Tecnologia, Comercial, RH, Financeiro, Operações, Marketing, Suporte ao Cliente)`)
  console.log(`  Colaboradores:    ${totalEmps}`)
  console.log(`  Pesquisas:        1 ano com scores variados por setor e por pergunta`)
  console.log(`  Alertas:          gerados dinamicamente por perfil de setor`)
  console.log(`  Planos de ação:   6 (2 concluídos, 2 em progresso, 2 abertos)`)
  console.log(`  Documentos:       ${DOCUMENT_TEMPLATES.length}`)
  console.log(`  Relatos anônimos: ${REPORT_TEMPLATES.length}`)
  console.log(`  Revisões PGR:     3`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
