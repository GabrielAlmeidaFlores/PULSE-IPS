import "dotenv/config"
import { env } from "../../env"
import { createLogger } from "../../libs/utils/logger"

const logger = createLogger("seed-demo")

import { createHash, randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInWeeks,
  endOfMonth,
  format,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns"
import { CLIMATE_SURVEY_SYSTEM_TOPICS } from "../../modules/climate-surveys/climate-survey.types"
import { getStorageService } from "../../libs/integrations"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const MAIN_SLUG = "meridiano"
const MAIN_NAME = "Grupo Meridiano"
const MAIN_CNPJ = "12.345.678/0001-90"
const TIMEZONE = "America/Sao_Paulo"

const ADMIN_EMAIL = "admin@meridiano.com.br"
const RH_EMAIL = "rh@meridiano.com.br"
const DEMO_PASSWORD = "Testando123!"

const NOW = new Date()
const START = startOfWeek(subWeeks(NOW, 112), { weekStartsOn: 1 })
const TOTAL_WEEKS = differenceInWeeks(NOW, START) + 1

let rngState = 20260101
function random(): number {
  rngState |= 0
  rngState = (rngState + 0x6d2b79f5) | 0
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function rand(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function pick<T>(items: T[]): T {
  const index = Math.floor(random() * items.length)
  return items[index] as T
}

function clamp(value: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function toHealthIndex(avg: number): number {
  return Math.round(((avg - 1) / 4) * 100)
}

function healthIndexLabel(index: number): string {
  if (index >= 62) return "Saudável"
  if (index >= 37) return "Atenção"
  return "Crítico"
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function competenciaOf(date: Date): string {
  return format(date, "yyyy-MM")
}

const shortCodePool = new Set<string>()
function nextShortCode(): string {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const code = String(rand(1000000, 9999999))
    if (!shortCodePool.has(code)) {
      shortCodePool.add(code)
      return code
    }
  }
  return String(Date.now()).slice(-7)
}

const DEFAULT_QUESTIONS = [
  { text: "Como você avalia seu nível de energia e disposição para trabalhar esta semana?", direction: "higher_is_better" },
  { text: "Você sente que sua carga de trabalho está equilibrada e gerenciável?", direction: "higher_is_better" },
  { text: "Como está a qualidade do relacionamento com sua equipe e liderança?", direction: "higher_is_better" },
  { text: "Você se sente reconhecido(a) e valorizado(a) pelo seu trabalho?", direction: "higher_is_better" },
  { text: "Qual é o seu nível de satisfação geral com o ambiente de trabalho?", direction: "higher_is_better" },
  { text: "Você tem conseguido se desligar do trabalho nos momentos de descanso?", direction: "higher_is_better" },
  { text: "Com que frequência você se sente esgotado(a) ao final da jornada?", direction: "lower_is_better" },
]

function buildSimplePdf(title: string, subtitle: string): Buffer {
  const escape = (value: string): string =>
    value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  const content = [
    `BT /F1 20 Tf 60 780 Td (${escape(title)}) Tj`,
    `0 -32 Td /F1 11 Tf (${escape(subtitle)}) Tj`,
    "0 -24 Td /F1 10 Tf (Grupo Meridiano - documento de demonstracao) Tj",
    "0 -18 Td /F1 10 Tf (Pulse IPS - Saude Ocupacional) Tj ET",
  ].join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(pdf, "latin1")
}

interface DeptProfile {
  deptName: string
  employeeCount: number
  workDays: number[]
  workStartTime: string
  workEndTime: string
  startWeek: number
  baseScore: (week: number) => number
  adherenceRate: (week: number) => number
}

const DEPT_PROFILES: DeptProfile[] = [
  {
    deptName: "Tecnologia",
    employeeCount: 18,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (week) => {
      if (week < 35) return clamp(4.1 + (random() - 0.5) * 0.5)
      if (week < 71) return clamp(3.0 + (random() - 0.5) * 0.8)
      if (week < 97) return clamp(3.6 + (random() - 0.5) * 0.5)
      return clamp(4.0 + (random() - 0.5) * 0.4)
    },
    adherenceRate: (week) => (week >= 35 && week < 71 ? 0.68 + random() * 0.1 : 0.86 + random() * 0.08),
  },
  {
    deptName: "Comercial",
    employeeCount: 16,
    workDays: [1, 2, 3, 4, 5, 6],
    workStartTime: "08:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (week) => {
      const weekInYear = week % 52
      if (weekInYear >= 34 && weekInYear <= 42) return clamp(3.5 + (random() - 0.5) * 0.6)
      return clamp(4.0 + (random() - 0.5) * 0.5)
    },
    adherenceRate: (week) => {
      const weekInYear = week % 52
      return weekInYear >= 34 && weekInYear <= 42 ? 0.8 + random() * 0.08 : 0.91 + random() * 0.07
    },
  },
  {
    deptName: "Recursos Humanos",
    employeeCount: 9,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: () => clamp(4.3 + (random() - 0.5) * 0.4),
    adherenceRate: () => 0.92 + random() * 0.08,
  },
  {
    deptName: "Financeiro",
    employeeCount: 12,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (week) => clamp(3.9 - week * 0.012 + (random() - 0.5) * 0.5),
    adherenceRate: (week) => clamp(0.85 - week * 0.002 + (random() - 0.5) * 0.06, 0.48, 0.88),
  },
  {
    deptName: "Operações",
    employeeCount: 22,
    workDays: [0, 1, 2, 3, 4, 5, 6],
    workStartTime: "07:00",
    workEndTime: "16:00",
    startWeek: 0,
    baseScore: (week) => {
      if (week < 52) return clamp(2.9 + (random() - 0.5) * 0.6)
      if (week < 87) return clamp(2.1 + (random() - 0.5) * 0.5)
      return clamp(2.7 + (random() - 0.5) * 0.5)
    },
    adherenceRate: (week) => (week >= 52 && week < 87 ? 0.5 + random() * 0.12 : 0.68 + random() * 0.12),
  },
  {
    deptName: "Marketing",
    employeeCount: 10,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (week) => {
      const cycle = Math.sin((week / 52) * Math.PI * 2)
      return clamp(3.6 + cycle * 0.6 + (random() - 0.5) * 0.4)
    },
    adherenceRate: () => 0.74 + random() * 0.18,
  },
  {
    deptName: "Suporte",
    employeeCount: 12,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 61,
    baseScore: (week) => {
      const relativeWeek = week - 61
      if (relativeWeek < 14) return clamp(4.0 + (random() - 0.5) * 0.5)
      if (relativeWeek < 34) return clamp(3.2 + (random() - 0.5) * 0.6)
      return clamp(3.8 + (random() - 0.5) * 0.4)
    },
    adherenceRate: (week) => {
      const relativeWeek = week - 61
      return relativeWeek >= 14 && relativeWeek < 34 ? 0.74 + random() * 0.1 : 0.86 + random() * 0.08
    },
  },
  {
    deptName: "Logística",
    employeeCount: 12,
    workDays: [1, 2, 3, 4, 5, 6],
    workStartTime: "06:00",
    workEndTime: "15:00",
    startWeek: 0,
    baseScore: (week) => {
      if (week < 48) return clamp(3.3 + (random() - 0.5) * 0.5)
      if (week < 82) return clamp(2.6 + (random() - 0.5) * 0.6)
      return clamp(3.1 + (random() - 0.5) * 0.4)
    },
    adherenceRate: (week) => (week >= 48 && week < 82 ? 0.6 + random() * 0.12 : 0.8 + random() * 0.1),
  },
  {
    deptName: "Jurídico",
    employeeCount: 6,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: () => clamp(4.0 + (random() - 0.5) * 0.4),
    adherenceRate: () => 0.9 + random() * 0.08,
  },
  {
    deptName: "Produto",
    employeeCount: 10,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "18:00",
    startWeek: 0,
    baseScore: (week) => {
      if (week < 42) return clamp(3.8 + (random() - 0.5) * 0.4)
      if (week < 74) return clamp(3.2 + (random() - 0.5) * 0.5)
      return clamp(3.6 + (random() - 0.5) * 0.4)
    },
    adherenceRate: (week) => (week >= 42 && week < 74 ? 0.72 + random() * 0.1 : 0.86 + random() * 0.08),
  },
  {
    deptName: "Qualidade",
    employeeCount: 8,
    workDays: [1, 2, 3, 4, 5],
    workStartTime: "08:00",
    workEndTime: "17:00",
    startWeek: 0,
    baseScore: () => clamp(3.9 + (random() - 0.5) * 0.45),
    adherenceRate: () => 0.88 + random() * 0.1,
  },
  {
    deptName: "Atendimento",
    employeeCount: 12,
    workDays: [1, 2, 3, 4, 5, 6],
    workStartTime: "08:00",
    workEndTime: "17:00",
    startWeek: 0,
    baseScore: (week) => {
      if (week < 56) return clamp(3.1 + (random() - 0.5) * 0.5)
      if (week < 88) return clamp(2.5 + (random() - 0.5) * 0.5)
      return clamp(3.0 + (random() - 0.5) * 0.4)
    },
    adherenceRate: (week) => (week >= 56 && week < 88 ? 0.58 + random() * 0.12 : 0.78 + random() * 0.1),
  },
]

const CURATED_EMPLOYEES_BY_DEPT: Record<string, { name: string; phone: string; email: string }[]> = {
  Tecnologia: [
    { name: "Lucas Ferreira", phone: "+5511911110001", email: "lucas.ferreira@meridiano.com.br" },
    { name: "Ana Paula Souza", phone: "+5511911110002", email: "ana.souza@meridiano.com.br" },
    { name: "Rafael Mendes", phone: "+5511911110003", email: "rafael.mendes@meridiano.com.br" },
    { name: "Carla Nunes", phone: "+5511911110004", email: "carla.nunes@meridiano.com.br" },
    { name: "Thiago Alves", phone: "+5511911110005", email: "thiago.alves@meridiano.com.br" },
    { name: "Beatriz Lima", phone: "+5511911110006", email: "beatriz.lima@meridiano.com.br" },
    { name: "Diego Costa", phone: "+5511911110007", email: "diego.costa@meridiano.com.br" },
    { name: "Fernanda Rocha", phone: "+5511911110008", email: "fernanda.rocha@meridiano.com.br" },
  ],
  Comercial: [
    { name: "Mariana Borges", phone: "+5511911110009", email: "mariana.borges@meridiano.com.br" },
    { name: "Felipe Santos", phone: "+5511911110010", email: "felipe.santos@meridiano.com.br" },
    { name: "Juliana Melo", phone: "+5511911110011", email: "juliana.melo@meridiano.com.br" },
    { name: "André Vieira", phone: "+5511911110012", email: "andre.vieira@meridiano.com.br" },
    { name: "Patricia Carvalho", phone: "+5511911110013", email: "patricia.carvalho@meridiano.com.br" },
    { name: "Ricardo Pinto", phone: "+5511911110014", email: "ricardo.pinto@meridiano.com.br" },
    { name: "Camila Torres", phone: "+5511911110015", email: "camila.torres@meridiano.com.br" },
  ],
  "Recursos Humanos": [
    { name: "Vanessa Monteiro", phone: "+5511911110016", email: "vanessa.monteiro@meridiano.com.br" },
    { name: "Eduardo Figueiredo", phone: "+5511911110017", email: "eduardo.figueiredo@meridiano.com.br" },
    { name: "Larissa Barbosa", phone: "+5511911110018", email: "larissa.barbosa@meridiano.com.br" },
    { name: "Gustavo Leal", phone: "+5511911110019", email: "gustavo.leal@meridiano.com.br" },
    { name: "Isabela Macedo", phone: "+5511911110020", email: "isabela.macedo@meridiano.com.br" },
  ],
  Financeiro: [
    { name: "Roberto Assis", phone: "+5511911110021", email: "roberto.assis@meridiano.com.br" },
    { name: "Tatiana Corrêa", phone: "+5511911110022", email: "tatiana.correa@meridiano.com.br" },
    { name: "Alexandre Cunha", phone: "+5511911110023", email: "alexandre.cunha@meridiano.com.br" },
    { name: "Priscila Ramos", phone: "+5511911110024", email: "priscila.ramos@meridiano.com.br" },
    { name: "Bruno Cavalcante", phone: "+5511911110025", email: "bruno.cavalcante@meridiano.com.br" },
    { name: "Michele Freitas", phone: "+5511911110026", email: "michele.freitas@meridiano.com.br" },
  ],
  Operações: [
    { name: "Jonas Teixeira", phone: "+5511911110027", email: "jonas.teixeira@meridiano.com.br" },
    { name: "Simone Andrade", phone: "+5511911110028", email: "simone.andrade@meridiano.com.br" },
    { name: "Mauro Rodrigues", phone: "+5511911110029", email: "mauro.rodrigues@meridiano.com.br" },
    { name: "Cristiane Peixoto", phone: "+5511911110030", email: "cristiane.peixoto@meridiano.com.br" },
    { name: "Leandro Moura", phone: "+5511911110031", email: "leandro.moura@meridiano.com.br" },
    { name: "Aline Nascimento", phone: "+5511911110032", email: "aline.nascimento@meridiano.com.br" },
    { name: "Paulo Siqueira", phone: "+5511911110033", email: "paulo.siqueira@meridiano.com.br" },
    { name: "Renata Campos", phone: "+5511911110034", email: "renata.campos@meridiano.com.br" },
    { name: "Sérgio Batista", phone: "+5511911110035", email: "sergio.batista@meridiano.com.br" },
  ],
  Marketing: [
    { name: "Natalia Duarte", phone: "+5511911110036", email: "natalia.duarte@meridiano.com.br" },
    { name: "Hugo Marques", phone: "+5511911110037", email: "hugo.marques@meridiano.com.br" },
    { name: "Gabriela Pereira", phone: "+5511911110038", email: "gabriela.pereira@meridiano.com.br" },
    { name: "Daniel Nogueira", phone: "+5511911110039", email: "daniel.nogueira@meridiano.com.br" },
    { name: "Amanda Xavier", phone: "+5511911110040", email: "amanda.xavier@meridiano.com.br" },
    { name: "Leonardo Fonseca", phone: "+5511911110041", email: "leonardo.fonseca@meridiano.com.br" },
  ],
  Suporte: [
    { name: "Claudia Araújo", phone: "+5511911110042", email: "claudia.araujo@meridiano.com.br" },
    { name: "Henrique Vaz", phone: "+5511911110043", email: "henrique.vaz@meridiano.com.br" },
    { name: "Patricia Neves", phone: "+5511911110044", email: "patricia.neves@meridiano.com.br" },
    { name: "Marcos Silveira", phone: "+5511911110045", email: "marcos.silveira@meridiano.com.br" },
    { name: "Juliana Castro", phone: "+5511911110046", email: "juliana.castro@meridiano.com.br" },
  ],
}

const FIRST_NAMES = [
  "Amanda", "André", "Beatriz", "Bruno", "Camila", "Carla", "Cristiane", "Daniel", "Diego", "Eduarda",
  "Eduardo", "Felipe", "Fernanda", "Gabriel", "Gabriela", "Gustavo", "Helena", "Hugo", "Isabela", "João",
  "Juliana", "Larissa", "Leandro", "Leonardo", "Lucas", "Luciana", "Marcos", "Mariana", "Maurício", "Natalia",
  "Otávio", "Patricia", "Paulo", "Priscila", "Rafael", "Renata", "Ricardo", "Roberto", "Sandro", "Sérgio",
  "Simone", "Tatiana", "Thiago", "Vanessa", "Vinícius", "Wagner", "Yasmin", "Zélia",
]

const LAST_NAMES = [
  "Almeida", "Alves", "Andrade", "Araújo", "Assis", "Barbosa", "Barros", "Batista", "Borges", "Braga",
  "Campos", "Cardoso", "Carvalho", "Castro", "Cavalcante", "Corrêa", "Costa", "Cunha", "Dias", "Duarte",
  "Farias", "Ferreira", "Figueiredo", "Fonseca", "Freitas", "Gomes", "Leal", "Lima", "Lopes", "Macedo",
  "Marques", "Martins", "Melo", "Mendes", "Monteiro", "Moura", "Nascimento", "Neves", "Nogueira", "Nunes",
  "Pereira", "Peixoto", "Pinto", "Pires", "Ramos", "Rocha", "Rodrigues", "Santos", "Silveira", "Siqueira",
  "Souza", "Teixeira", "Torres", "Vaz", "Vieira", "Xavier",
]

function normalizeIdentifier(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
}

function buildEmployeesByDepartment(): Record<string, { name: string; phone: string; email: string }[]> {
  const usedEmails = new Set<string>()
  for (const employees of Object.values(CURATED_EMPLOYEES_BY_DEPT)) {
    for (const employee of employees) usedEmails.add(employee.email)
  }

  const result: Record<string, { name: string; phone: string; email: string }[]> = {}
  DEPT_PROFILES.forEach((profile, deptIndex) => {
    const list = [...(CURATED_EMPLOYEES_BY_DEPT[profile.deptName] ?? [])]
    let generatedIndex = 0
    while (list.length < profile.employeeCount) {
      const firstName = FIRST_NAMES[(deptIndex * 7 + generatedIndex * 3) % FIRST_NAMES.length] ?? "Ana"
      const lastName = LAST_NAMES[(deptIndex * 11 + generatedIndex * 5) % LAST_NAMES.length] ?? "Silva"
      const base = `${normalizeIdentifier(firstName)}.${normalizeIdentifier(lastName)}`
      let email = `${base}@meridiano.com.br`
      let suffix = 2
      while (usedEmails.has(email)) {
        email = `${base}${suffix}@meridiano.com.br`
        suffix += 1
      }
      usedEmails.add(email)
      list.push({
        name: `${firstName} ${lastName}`,
        phone: `+55119${String(20000000 + deptIndex * 1000 + generatedIndex).slice(-8)}`,
        email,
      })
      generatedIndex += 1
    }
    result[profile.deptName] = list
  })
  return result
}

const EMPLOYEES_BY_DEPT = buildEmployeesByDepartment()

const CLIMATE_QUESTIONS = [
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
  { text: "Você tem flexibilidade suficiente na rotina?", dimension: "work_life_balance" },
  { text: "A empresa apoia saúde mental e física?", dimension: "work_life_balance" },
  { text: "Você se identifica com os valores da empresa?", dimension: "organizational_culture" },
  { text: "Existe colaboração entre as equipes?", dimension: "organizational_culture" },
  { text: "O ambiente é respeitoso e inclusivo?", dimension: "organizational_culture" },
  { text: "Você confia nas decisões da liderança?", dimension: "leadership_trust" },
  { text: "A liderança se preocupa com o bem-estar das pessoas?", dimension: "leadership_trust" },
  { text: "A liderança inspira e motiva a equipe?", dimension: "leadership_trust" },
  { text: "Você se sente seguro(a) para discordar sem represálias?", dimension: "psychological_safety" },
  { text: "Você consegue admitir erros sem medo de punição?", dimension: "psychological_safety" },
]

const CLIMATE_DIMENSION_BIAS: Record<string, number> = {
  recognition_reward: -0.9,
  leadership_trust: -0.85,
  professional_development: -0.75,
  internal_communication: -0.6,
  work_life_balance: -0.45,
  psychological_safety: -0.6,
  relationships: 0.3,
  organizational_culture: 0.3,
  job_satisfaction: 0.3,
}

const CLIMATE_COMMENTS = [
  "O time está mais unido neste trimestre. A comunicação melhorou bastante.",
  "Ainda sinto falta de clareza nas metas de longo prazo.",
  "O novo programa de reconhecimento fez diferença no meu dia a dia.",
  "A carga de trabalho continua alta, mas a liderança tem sido mais flexível.",
  "Gostaria de mais oportunidades de treinamento técnico.",
  "O ambiente está mais leve depois das ações do último trimestre.",
  "Precisamos de mais autonomia para tomar decisões no operacional.",
  "A comunicação entre setores ainda é o maior ponto de atrito.",
  "Me sinto ouvido pelos gestores, mas falta retorno sobre o que foi decidido.",
  "O equilíbrio entre vida pessoal e trabalho melhorou com o modelo híbrido.",
]

interface SeedContext {
  tenantId: string
  adminUserId: string
  rhUserId: string
  deptMap: Record<string, string>
  employeeMap: Record<string, string[]>
  employees: { id: string; name: string; email: string; departmentId: string; departmentName: string }[]
  healthConfigId: string
  healthQuestionIds: string[]
  healthDispatchIds: string[]
  consentTermVersionId: string
  platformTermsVersionId: string
}

async function wipeDemoData(): Promise<void> {
  logger.info("Limpando dados de demonstração anteriores...")

  const deletions: { label: string; run: () => Promise<unknown> }[] = [
    { label: "climateSurveyResponseItem", run: () => prisma.climateSurveyResponseItem.deleteMany() },
    { label: "climateSurveyResponseSession", run: () => prisma.climateSurveyResponseSession.deleteMany() },
    { label: "climateSurveyAnalyticsEvent", run: () => prisma.climateSurveyAnalyticsEvent.deleteMany() },
    { label: "climateSurveyResponse", run: () => prisma.climateSurveyResponse.deleteMany() },
    { label: "climateSurveyResponseTokenWorkDay", run: () => prisma.climateSurveyResponseTokenWorkDay.deleteMany() },
    { label: "climateSurveyResponseToken", run: () => prisma.climateSurveyResponseToken.deleteMany() },
    { label: "climateSurveyDeptDispatch", run: () => prisma.climateSurveyDeptDispatch.deleteMany() },
    { label: "climateSurveyActionSuggestion", run: () => prisma.climateSurveyActionSuggestion.deleteMany() },
    { label: "climateSurveyDispatch", run: () => prisma.climateSurveyDispatch.deleteMany() },
    { label: "climateSurveyQuestion", run: () => prisma.climateSurveyQuestion.deleteMany() },
    { label: "climateSurveyConfigWorkDay", run: () => prisma.climateSurveyConfigWorkDay.deleteMany() },
    { label: "climateSurveyConfigDepartment", run: () => prisma.climateSurveyConfigDepartment.deleteMany() },
    { label: "climateSurveyConfiguration", run: () => prisma.climateSurveyConfiguration.deleteMany() },
    { label: "climateSurveyTopic", run: () => prisma.climateSurveyTopic.deleteMany() },
    { label: "emailLog", run: () => prisma.emailLog.deleteMany() },
    { label: "messageLog", run: () => prisma.messageLog.deleteMany() },
    { label: "healthSurveyResponseItem", run: () => prisma.healthSurveyResponseItem.deleteMany() },
    { label: "healthSurveyResponse", run: () => prisma.healthSurveyResponse.deleteMany() },
    { label: "healthSurveyResponseTokenWorkDay", run: () => prisma.healthSurveyResponseTokenWorkDay.deleteMany() },
    { label: "healthSurveyResponseToken", run: () => prisma.healthSurveyResponseToken.deleteMany() },
    { label: "healthSurveyDeptDispatch", run: () => prisma.healthSurveyDeptDispatch.deleteMany() },
    { label: "healthSurveyDispatch", run: () => prisma.healthSurveyDispatch.deleteMany() },
    { label: "healthSurveyQuestion", run: () => prisma.healthSurveyQuestion.deleteMany() },
    { label: "healthSurveyConfigWorkDay", run: () => prisma.healthSurveyConfigWorkDay.deleteMany() },
    { label: "healthSurveyConfigDepartment", run: () => prisma.healthSurveyConfigDepartment.deleteMany() },
    { label: "healthSurveyConfiguration", run: () => prisma.healthSurveyConfiguration.deleteMany() },
    { label: "employeeConsent", run: () => prisma.employeeConsent.deleteMany() },
    { label: "pgrDeptResult", run: () => prisma.pgrDeptResult.deleteMany() },
    { label: "pgrQuestionResult", run: () => prisma.pgrQuestionResult.deleteMany() },
    { label: "pgrReview", run: () => prisma.pgrReview.deleteMany() },
    { label: "workforceInsight", run: () => prisma.workforceInsight.deleteMany() },
    { label: "actionPlanSuggestionTask", run: () => prisma.actionPlanSuggestionTask.deleteMany() },
    { label: "actionPlanSuggestion", run: () => prisma.actionPlanSuggestion.deleteMany() },
    { label: "actionPlanTask", run: () => prisma.actionPlanTask.deleteMany() },
    { label: "actionPlan", run: () => prisma.actionPlan.deleteMany() },
    { label: "anonymousReport", run: () => prisma.anonymousReport.deleteMany() },
    { label: "documentVersion", run: () => prisma.documentVersion.deleteMany() },
    { label: "document", run: () => prisma.document.deleteMany() },
    { label: "alert", run: () => prisma.alert.deleteMany() },
    { label: "employeeWorkDay", run: () => prisma.employeeWorkDay.deleteMany() },
    { label: "employeeMonthly", run: () => prisma.employeeMonthly.deleteMany() },
    { label: "dataImportBatch", run: () => prisma.dataImportBatch.deleteMany() },
    { label: "employee", run: () => prisma.employee.deleteMany() },
    { label: "departmentWorkDay", run: () => prisma.departmentWorkDay.deleteMany() },
    { label: "department", run: () => prisma.department.deleteMany() },
    { label: "platformTermsAcceptance", run: () => prisma.platformTermsAcceptance.deleteMany() },
    { label: "organizationInvitation", run: () => prisma.organizationInvitation.deleteMany() },
    { label: "authToken", run: () => prisma.authToken.deleteMany() },
    { label: "billingWebhookEvent", run: () => prisma.billingWebhookEvent.deleteMany() },
    { label: "subscriptionFeature", run: () => prisma.subscriptionFeature.deleteMany() },
    { label: "organizationSubscription", run: () => prisma.organizationSubscription.deleteMany() },
    { label: "auditLog", run: () => prisma.auditLog.deleteMany() },
    { label: "organizationUser", run: () => prisma.organizationUser.deleteMany() },
    { label: "organization", run: () => prisma.organization.deleteMany() },
    { label: "requestLog", run: () => prisma.requestLog.deleteMany() },
    { label: "jobLog", run: () => prisma.jobLog.deleteMany() },
  ]

  for (const deletion of deletions) {
    try {
      await deletion.run()
    } catch (error) {
      logger.warn(`Falha ao limpar ${deletion.label}`, error instanceof Error ? error.message : String(error))
    }
  }

  logger.success("Base limpa (planos, super admin e documentos legais preservados).")
}

async function seedMainOrganization(
  professionalPlan: { id: string; priceInCents: number },
  consentVersionId: string,
  termsVersionId: string,
): Promise<SeedContext> {
  const org = await prisma.organization.create({
    data: {
      id: randomUUID(),
      slug: MAIN_SLUG,
      name: MAIN_NAME,
      cnpj: MAIN_CNPJ,
      planId: professionalPlan.id,
      timezone: TIMEZONE,
      billingStatus: "active",
      isActive: true,
      createdAt: subMonths(NOW, 30),
    },
  })

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const admin = await prisma.organizationUser.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Camila Andrade",
      role: "admin",
      isActive: true,
      emailVerifiedAt: START,
    },
  })
  const rh = await prisma.organizationUser.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      email: RH_EMAIL,
      passwordHash,
      name: "Rafaela Martins",
      role: "rh",
      isActive: true,
      emailVerifiedAt: START,
    },
  })
  const admin2 = await prisma.organizationUser.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      email: "marcos.pereira@meridiano.com.br",
      passwordHash,
      name: "Marcos Pereira",
      role: "admin",
      isActive: true,
      emailVerifiedAt: addMonths(START, 3),
    },
  })
  const rh2 = await prisma.organizationUser.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      email: "juliana.rocha@meridiano.com.br",
      passwordHash,
      name: "Juliana Rocha",
      role: "rh",
      isActive: true,
      emailVerifiedAt: addMonths(START, 6),
    },
  })

  await prisma.platformTermsAcceptance.createMany({
    data: [
      { id: randomUUID(), termsVersionId, userId: admin.id, acceptedAt: START, ipAddress: "191.10.20.30", userAgent: "Mozilla/5.0 (Macintosh) AppleWebKit/537.36" },
      { id: randomUUID(), termsVersionId, userId: rh.id, acceptedAt: START, ipAddress: "191.10.20.31", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126" },
      { id: randomUUID(), termsVersionId, userId: admin2.id, acceptedAt: addMonths(START, 3), ipAddress: "191.10.20.44", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/125" },
      { id: randomUUID(), termsVersionId, userId: rh2.id, acceptedAt: addMonths(START, 6), ipAddress: "191.10.20.45", userAgent: "Mozilla/5.0 (Macintosh) Safari/17.4" },
    ],
  })

  await prisma.organizationInvitation.createMany({
    data: [
      { id: randomUUID(), tenantId: org.id, email: "novo.gestor@meridiano.com.br", role: "rh", token: randomUUID(), expiresAt: addDays(NOW, 3), usedAt: null, createdAt: addDays(NOW, -1) },
      { id: randomUUID(), tenantId: org.id, email: "diretoria@meridiano.com.br", role: "admin", token: randomUUID(), expiresAt: addDays(NOW, 5), usedAt: null, createdAt: addDays(NOW, -2) },
      { id: randomUUID(), tenantId: org.id, email: "histórico.rh@meridiano.com.br", role: "rh", token: randomUUID(), expiresAt: addDays(NOW, 30), usedAt: addMonths(NOW, -4), createdAt: addMonths(NOW, -4) },
    ],
  })

  await prisma.authToken.createMany({
    data: [
      { id: randomUUID(), userId: admin.id, type: "password_reset", token: randomUUID(), usedAt: addMonths(NOW, -2), expiresAt: addMonths(NOW, -2), createdAt: addMonths(NOW, -2) },
      { id: randomUUID(), userId: rh.id, type: "password_reset", token: randomUUID(), usedAt: null, expiresAt: addDays(NOW, -1), createdAt: addDays(NOW, -2) },
      { id: randomUUID(), userId: admin2.id, type: "email_verification", token: randomUUID(), usedAt: addMonths(START, 3), expiresAt: addMonths(START, 3), createdAt: addMonths(START, 3) },
    ],
  })

  const subscription = await prisma.organizationSubscription.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      planId: professionalPlan.id,
      externalSubscriptionId: `sub_meridiano_${org.id.slice(0, 8)}`,
      status: "active",
      currentPeriodStart: startOfMonth(NOW),
      currentPeriodEnd: addMonths(startOfMonth(NOW), 1),
      cancelAtPeriodEnd: false,
      snapshotPlanName: "Professional",
      snapshotMaxEmployees: 150,
      snapshotPriceInCents: professionalPlan.priceInCents,
      snapshotInterval: "month",
      snapshotExternalPriceId: "price_professional_monthly",
    },
  })
  await prisma.subscriptionFeature.createMany({
    data: (["action_plans", "documents", "anonymous_reports", "pgr", "messaging", "climate_surveys"] as const).map((feature) => ({
      subscriptionId: subscription.id,
      feature,
    })),
  })

  const webhookTypes = [
    "checkout.session.completed",
    "invoice.payment_succeeded",
    "customer.subscription.updated",
    "invoice.payment_failed",
    "customer.subscription.deleted",
    "customer.subscription.created",
  ]
  const webhookRows: Prisma.BillingWebhookEventCreateManyInput[] = []
  for (let index = 0; index < 18; index += 1) {
    const type = webhookTypes[index % webhookTypes.length] ?? "invoice.payment_succeeded"
    const failed = index === 16
    webhookRows.push({
      id: randomUUID(),
      tenantId: org.id,
      externalEventId: `evt_meridiano_${index}_${randomUUID().slice(0, 8)}`,
      type,
      processedAt: failed ? null : addDays(NOW, -index * 5),
      error: failed ? "Timeout ao sincronizar assinatura com o provedor." : null,
      payload: {
        id: `evt_demo_${index}`,
        type,
        data: { object: { id: subscription.externalSubscriptionId, status: "active" } },
      },
      createdAt: addDays(NOW, -index * 5),
    })
  }
  await prisma.billingWebhookEvent.createMany({ data: webhookRows })

  const deptMap: Record<string, string> = {}
  const employeeMap: Record<string, string[]> = {}
  const employees: SeedContext["employees"] = []

  for (const profile of DEPT_PROFILES) {
    const department = await prisma.department.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        name: profile.deptName,
        isActive: true,
        workStartTime: profile.workStartTime,
        workEndTime: profile.workEndTime,
        createdAt: addWeeks(START, profile.startWeek),
      },
    })
    deptMap[profile.deptName] = department.id
    await prisma.departmentWorkDay.createMany({
      data: profile.workDays.map((dayOfWeek) => ({ departmentId: department.id, dayOfWeek })),
    })

    const departmentEmployees = EMPLOYEES_BY_DEPT[profile.deptName] ?? []
    const ids: string[] = []
    let index = 0
    for (const person of departmentEmployees) {
      index += 1
      const employee = await prisma.employee.create({
        data: {
          id: randomUUID(),
          tenantId: org.id,
          departmentId: department.id,
          name: person.name,
          phone: person.phone,
          email: person.email,
          document: `${rand(100, 999)}.${rand(100, 999)}.${rand(100, 999)}-${String(rand(10, 99))}`,
          status: "active",
          createdAt: addDays(addWeeks(START, profile.startWeek), index),
        },
      })
      ids.push(employee.id)
      employees.push({
        id: employee.id,
        name: employee.name,
        email: person.email,
        departmentId: department.id,
        departmentName: profile.deptName,
      })
      await prisma.employeeConsent.create({
        data: {
          id: randomUUID(),
          tenantId: org.id,
          employeeId: employee.id,
          consentTermVersionId: consentVersionId,
          event: "accepted",
          source: "message_link",
          documentHash: hash(employee.document ?? employee.id),
          createdAt: addDays(addWeeks(START, profile.startWeek), index + 1),
        },
      })

      if (index % 9 === 0) {
        await prisma.employeeWorkDay.createMany({
          data: [2, 3, 4, 5, 6].map((dayOfWeek) => ({ employeeId: employee.id, dayOfWeek })),
        })
      } else if (index % 11 === 0) {
        await prisma.employeeWorkDay.createMany({
          data: [1, 2, 3, 4].map((dayOfWeek) => ({ employeeId: employee.id, dayOfWeek })),
        })
      }
    }
    employeeMap[profile.deptName] = ids
  }

  const healthConfig = await prisma.healthSurveyConfiguration.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      name: "Pesquisa de Saúde Ocupacional",
      description: "Monitoramento semanal de bem-estar e fatores psicossociais por setor.",
      frequency: "weekly",
      dispatchTime: "09:00",
      tokenExpiryHours: 48,
      isActive: true,
      createdAt: START,
    },
  })
  await prisma.healthSurveyConfigDepartment.createMany({
    data: Object.values(deptMap).map((departmentId) => ({ configId: healthConfig.id, departmentId })),
  })
  await prisma.healthSurveyConfigWorkDay.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ configId: healthConfig.id, dayOfWeek })),
  })

  const healthQuestionIds: string[] = []
  for (let index = 0; index < DEFAULT_QUESTIONS.length; index += 1) {
    const question = DEFAULT_QUESTIONS[index]
    if (!question) continue
    const created = await prisma.healthSurveyQuestion.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        healthSurveyConfigurationId: healthConfig.id,
        text: question.text,
        order: index + 1,
        scoreDirection: question.direction,
        isActive: true,
      },
    })
    healthQuestionIds.push(created.id)
  }

  const inactiveConfig = await prisma.healthSurveyConfiguration.create({
    data: {
      id: randomUUID(),
      tenantId: org.id,
      name: "Pesquisa de Ergonomia (piloto)",
      description: "Piloto de avaliação ergonômica realizado no setor de Operações.",
      frequency: "monthly",
      scheduledDayOfMonth: 10,
      dispatchTime: "10:30",
      tokenExpiryHours: 72,
      isActive: false,
      createdAt: subMonths(NOW, 8),
    },
  })
  await prisma.healthSurveyConfigDepartment.create({
    data: { configId: inactiveConfig.id, departmentId: deptMap["Operações"] ?? "" },
  })
  await prisma.healthSurveyConfigWorkDay.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ configId: inactiveConfig.id, dayOfWeek })),
  })
  const ergonomicsQuestions = [
    "As condições físicas do ambiente de trabalho são adequadas?",
    "Os equipamentos e ferramentas estão em boas condições de uso?",
    "Você sente dores físicas decorrentes das atividades de trabalho?",
  ]
  for (let index = 0; index < ergonomicsQuestions.length; index += 1) {
    await prisma.healthSurveyQuestion.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        healthSurveyConfigurationId: inactiveConfig.id,
        text: ergonomicsQuestions[index] ?? "",
        order: index + 1,
        scoreDirection: index === 2 ? "lower_is_better" : "higher_is_better",
        isActive: false,
      },
    })
  }

  return {
    tenantId: org.id,
    adminUserId: admin.id,
    rhUserId: rh.id,
    deptMap,
    employeeMap,
    employees,
    healthConfigId: healthConfig.id,
    healthQuestionIds,
    healthDispatchIds: [],
    consentTermVersionId: consentVersionId,
    platformTermsVersionId: termsVersionId,
  }
}

async function seedHealthSurveyHistory(context: SeedContext): Promise<void> {
  logger.info(`Gerando histórico de ${TOTAL_WEEKS} semanas de pesquisas de saúde...`)

  const dispatchRows: Prisma.HealthSurveyDispatchCreateManyInput[] = []
  const deptDispatchRows: Prisma.HealthSurveyDeptDispatchCreateManyInput[] = []
  const tokenRows: Prisma.HealthSurveyResponseTokenCreateManyInput[] = []
  const responseRows: Prisma.HealthSurveyResponseCreateManyInput[] = []
  const itemRows: Prisma.HealthSurveyResponseItemCreateManyInput[] = []
  const alertRows: Prisma.AlertCreateManyInput[] = []

  const previousAverageByDept = new Map<string, number>()

  for (let week = 0; week < TOTAL_WEEKS; week += 1) {
    const dispatchDate = setMinutes(setHours(addWeeks(START, week), 9), 0)
    if (dispatchDate > NOW) break

    const dispatchId = randomUUID()
    const isCurrentWeek = differenceInWeeks(NOW, dispatchDate) < 1
    dispatchRows.push({
      id: dispatchId,
      tenantId: context.tenantId,
      healthSurveyConfigurationId: context.healthConfigId,
      scheduledAt: dispatchDate,
      dispatchedAt: dispatchDate,
      adherenceCheckedAt: addDays(dispatchDate, 2),
      status: "available",
      source: week % 17 === 0 ? "manual" : "auto",
      signedLinkToken: randomUUID(),
      createdAt: dispatchDate,
    })
    context.healthDispatchIds.push(dispatchId)

    for (const profile of DEPT_PROFILES) {
      if (week < profile.startWeek) continue
      const departmentId = context.deptMap[profile.deptName]
      const employeeIds = context.employeeMap[profile.deptName] ?? []
      if (!departmentId || employeeIds.length === 0) continue

      const adherence = isCurrentWeek ? 0.45 + random() * 0.15 : profile.adherenceRate(week)
      const respondentCount = Math.max(1, Math.round(employeeIds.length * adherence))
      const respondents = employeeIds.slice(0, respondentCount)
      const respondentSet = new Set(respondents)

      deptDispatchRows.push({
        dispatchId,
        departmentId,
        totalRecipients: employeeIds.length,
        totalResponses: respondents.length,
      })

      const scores: number[] = []
      for (const employeeId of employeeIds) {
        const used = respondentSet.has(employeeId)
        const score = used ? clamp(Math.round(profile.baseScore(week) + (random() - 0.5) * 1.2)) : null
        if (score !== null) scores.push(score)

        const usedAt = used ? addHours(dispatchDate, rand(1, 7)) : null
        tokenRows.push({
          id: randomUUID(),
          tenantId: context.tenantId,
          dispatchId,
          employeeId,
          token: randomUUID(),
          shortCode: nextShortCode(),
          expiresAt: addDays(dispatchDate, 2),
          workStartTime: profile.workStartTime,
          workEndTime: profile.workEndTime,
          usedAt,
          reminderSentAt: used ? null : addHours(dispatchDate, 24),
          createdAt: dispatchDate,
        })

        if (score === null || usedAt === null) continue

        const responseId = randomUUID()
        responseRows.push({
          id: responseId,
          tenantId: context.tenantId,
          dispatchId,
          departmentId,
          createdAt: usedAt,
        })
        for (const questionId of context.healthQuestionIds) {
          itemRows.push({
            id: randomUUID(),
            healthSurveyResponseId: responseId,
            questionId,
            score: clamp(Math.round(score + (random() - 0.5) * 0.8)),
          })
        }
      }

      const average = scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 3
      const previousAverage = previousAverageByDept.get(profile.deptName) ?? 3.5
      const isRecent = differenceInWeeks(NOW, dispatchDate) <= 16

      if (isRecent && adherence < 0.8 && employeeIds.length >= 5) {
        const percent = Math.round(adherence * 100)
        alertRows.push({
          id: randomUUID(),
          tenantId: context.tenantId,
          departmentId,
          type: adherence < 0.5 ? "no_response" : "low_adherence",
          severity: adherence < 0.3 ? "critical" : "warning",
          message: `Taxa de adesão: ${percent}% (${respondents.length}/${employeeIds.length}) — ${profile.deptName}`,
          isRead: week < TOTAL_WEEKS - 3,
          resolvedAt: week < TOTAL_WEEKS - 6 ? addDays(dispatchDate, rand(3, 10)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      if (isRecent && previousAverage - average > 1) {
        const drop = previousAverage - average
        alertRows.push({
          id: randomUUID(),
          tenantId: context.tenantId,
          departmentId,
          type: "score_drop",
          severity: drop > 2 ? "critical" : "warning",
          message: `Queda de ${drop.toFixed(1)} pontos — ${profile.deptName}: de ${toHealthIndex(previousAverage)}% para ${toHealthIndex(average)}%.`,
          isRead: week < TOTAL_WEEKS - 3,
          resolvedAt: week < TOTAL_WEEKS - 6 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      if (isRecent && average < 3 && employeeIds.length >= 5) {
        const index = toHealthIndex(average)
        alertRows.push({
          id: randomUUID(),
          tenantId: context.tenantId,
          departmentId,
          type: "low_score",
          severity: average < 2 ? "critical" : "warning",
          message: `Índice de saúde baixo — ${profile.deptName}: ${index}% (${healthIndexLabel(index)}).`,
          isRead: week < TOTAL_WEEKS - 3,
          resolvedAt: week < TOTAL_WEEKS - 6 ? addDays(dispatchDate, rand(5, 14)) : null,
          createdAt: addDays(dispatchDate, 2),
        })
      }

      previousAverageByDept.set(profile.deptName, average)
    }
  }

  alertRows.push(
    {
      id: randomUUID(),
      tenantId: context.tenantId,
      departmentId: context.deptMap["Financeiro"] ?? null,
      type: "negative_trend",
      severity: "warning",
      message: `Financeiro apresenta tendência negativa por 3 períodos consecutivos abaixo da média histórica. Índice atual: ${toHealthIndex(2.9)}%.`,
      isRead: false,
      resolvedAt: null,
      createdAt: addDays(NOW, -7),
    },
    {
      id: randomUUID(),
      tenantId: context.tenantId,
      departmentId: context.deptMap["Operações"] ?? null,
      type: "negative_trend",
      severity: "critical",
      message: `Operações com tendência negativa persistente — índice em ${toHealthIndex(2.3)}% por 5 períodos consecutivos.`,
      isRead: false,
      resolvedAt: null,
      createdAt: addDays(NOW, -5),
    },
    {
      id: randomUUID(),
      tenantId: context.tenantId,
      departmentId: null,
      type: "pgr_review_due",
      severity: "warning",
      message: `Revisão PGR prevista para ${format(addDays(NOW, 28), "dd/MM/yyyy")}.`,
      isRead: false,
      resolvedAt: null,
      createdAt: addDays(NOW, -3),
    },
    {
      id: randomUUID(),
      tenantId: context.tenantId,
      departmentId: null,
      type: "crisis_report",
      severity: "critical",
      message: "Relato anônimo com indicadores de crise detectado. Ação imediata de acolhimento recomendada.",
      isRead: false,
      resolvedAt: null,
      createdAt: addHours(NOW, -18),
    },
  )

  const BATCH = 1000
  for (let index = 0; index < dispatchRows.length; index += BATCH) {
    await prisma.healthSurveyDispatch.createMany({ data: dispatchRows.slice(index, index + BATCH) })
  }
  for (let index = 0; index < deptDispatchRows.length; index += BATCH) {
    await prisma.healthSurveyDeptDispatch.createMany({ data: deptDispatchRows.slice(index, index + BATCH) })
  }
  for (let index = 0; index < tokenRows.length; index += BATCH) {
    await prisma.healthSurveyResponseToken.createMany({ data: tokenRows.slice(index, index + BATCH) })
  }
  for (let index = 0; index < responseRows.length; index += BATCH) {
    await prisma.healthSurveyResponse.createMany({ data: responseRows.slice(index, index + BATCH) })
  }
  for (let index = 0; index < itemRows.length; index += BATCH) {
    await prisma.healthSurveyResponseItem.createMany({ data: itemRows.slice(index, index + BATCH) })
  }
  await prisma.alert.createMany({ data: alertRows })

  logger.success(
    `Saúde: ${dispatchRows.length} dispatches, ${tokenRows.length} tokens, ${responseRows.length} respostas, ${alertRows.length} alertas.`,
  )
}

interface ClimateWave {
  dispatchId: string
  scheduledAt: Date
  promoterShare: number
}

async function seedClimateSurveys(context: SeedContext): Promise<ClimateWave[]> {
  logger.info("Criando Pesquisa de Clima (4 ondas trimestrais)...")

  const config = await prisma.climateSurveyConfiguration.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      name: "Pesquisa de Clima Organizacional",
      description: "Avaliação trimestral de clima por tópicos, com comparativo entre ondas.",
      frequency: "quarterly",
      dispatchTime: "10:00",
      tokenExpiryHours: 120,
      sendViaMessaging: true,
      sendViaSignedLink: false,
      isActive: true,
      createdAt: subMonths(NOW, 14),
    },
  })
  await prisma.climateSurveyConfigDepartment.createMany({
    data: Object.values(context.deptMap).map((departmentId) => ({ configId: config.id, departmentId })),
  })
  await prisma.climateSurveyConfigWorkDay.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ configId: config.id, dayOfWeek })),
  })

  await prisma.climateSurveyTopic.createMany({
    data: [
      ...CLIMATE_SURVEY_SYSTEM_TOPICS.map((topic) => ({
        id: randomUUID(),
        tenantId: context.tenantId,
        key: topic.key,
        label: topic.label,
        isSystem: true,
        isActive: true,
        sortOrder: topic.sortOrder,
      })),
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        key: "psychological_safety",
        label: "Segurança Psicológica",
        isSystem: false,
        isActive: true,
        sortOrder: 9,
      },
    ],
  })

  const questionIds: string[] = []
  for (let index = 0; index < CLIMATE_QUESTIONS.length; index += 1) {
    const question = CLIMATE_QUESTIONS[index]
    if (!question) continue
    const created = await prisma.climateSurveyQuestion.create({
      data: {
        id: randomUUID(),
        tenantId: context.tenantId,
        climateSurveyConfigurationId: config.id,
        text: question.text,
        order: index + 1,
        scoreDirection: "higher_is_better",
        dimension: question.dimension,
        isActive: true,
      },
    })
    questionIds.push(created.id)
  }

  const pilotConfig = await prisma.climateSurveyConfiguration.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      name: "Pesquisa de Clima — Piloto 2025",
      description: "Piloto realizado com dois setores antes da implantação corporativa.",
      frequency: "monthly",
      scheduledDayOfMonth: 15,
      dispatchTime: "14:00",
      tokenExpiryHours: 72,
      sendViaMessaging: true,
      sendViaSignedLink: false,
      isActive: false,
      createdAt: subMonths(NOW, 15),
    },
  })
  for (const departmentName of ["Operações", "Comercial"]) {
    const departmentId = context.deptMap[departmentName]
    if (!departmentId) continue
    await prisma.climateSurveyConfigDepartment.create({ data: { configId: pilotConfig.id, departmentId } })
  }
  await prisma.climateSurveyConfigWorkDay.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ configId: pilotConfig.id, dayOfWeek })),
  })
  for (let index = 0; index < 8; index += 1) {
    const question = CLIMATE_QUESTIONS[index]
    if (!question) continue
    await prisma.climateSurveyQuestion.create({
      data: {
        id: randomUUID(),
        tenantId: context.tenantId,
        climateSurveyConfigurationId: pilotConfig.id,
        text: question.text,
        order: index + 1,
        scoreDirection: "higher_is_better",
        dimension: question.dimension,
        isActive: false,
      },
    })
  }

  await prisma.climateSurveyAnalyticsEvent.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        event: "pesquisa_criada",
        configId: config.id,
        quantity: 1,
        createdAt: config.createdAt,
      },
      ...questionIds.map((questionId, index) => ({
        id: randomUUID(),
        tenantId: context.tenantId,
        event: "pergunta_selecionada",
        configId: config.id,
        questionId,
        questionOrder: index + 1,
        quantity: 1,
        createdAt: addDays(config.createdAt, 1),
      })),
    ],
  })

  const waveDefinitions = [
    { daysAgo: 460, promoterShare: 0.1, detractorShare: 0.55 },
    { daysAgo: 370, promoterShare: 0.12, detractorShare: 0.48 },
    { daysAgo: 280, promoterShare: 0.15, detractorShare: 0.45 },
    { daysAgo: 190, promoterShare: 0.2, detractorShare: 0.35 },
    { daysAgo: 100, promoterShare: 0.3, detractorShare: 0.22 },
    { daysAgo: 2, promoterShare: 0.45, detractorShare: 0.1 },
  ]
  const waves: ClimateWave[] = []
  const emailLogRows: Prisma.EmailLogCreateManyInput[] = []
  const analyticsRows: Prisma.ClimateSurveyAnalyticsEventCreateManyInput[] = []

  for (const definition of waveDefinitions) {
    const dispatchId = randomUUID()
    const waveDate = setMinutes(setHours(addDays(NOW, -definition.daysAgo), 10), 0)
    waves.push({ dispatchId, scheduledAt: waveDate, promoterShare: definition.promoterShare })

    await prisma.climateSurveyDispatch.create({
      data: {
        id: dispatchId,
        tenantId: context.tenantId,
        climateSurveyConfigurationId: config.id,
        scheduledAt: waveDate,
        dispatchedAt: waveDate,
        adherenceCheckedAt: addDays(waveDate, 2),
        status: "available",
        source: "manual",
        signedLinkToken: randomUUID(),
        createdAt: waveDate,
      },
    })

    analyticsRows.push(
      { id: randomUUID(), tenantId: context.tenantId, event: "campanha_disparada", configId: config.id, dispatchId, quantity: 1, createdAt: waveDate },
    )

    let waveResponses = 0
    let waveRecipients = 0
    let promoters = 0
    let detractors = 0

    for (const profile of DEPT_PROFILES) {
      const departmentId = context.deptMap[profile.deptName]
      const employeeIds = context.employeeMap[profile.deptName] ?? []
      if (!departmentId || employeeIds.length === 0) continue

      const targetAdherence = 0.7 + random() * 0.22
      const respondentCount = Math.max(5, Math.round(employeeIds.length * targetAdherence))
      const respondents = employeeIds.slice(0, Math.min(respondentCount, employeeIds.length))
      waveRecipients += employeeIds.length
      waveResponses += respondents.length

      await prisma.climateSurveyDeptDispatch.create({
        data: {
          dispatchId,
          departmentId,
          totalRecipients: employeeIds.length,
          totalResponses: respondents.length,
        },
      })

      let nonRespondentIndex = 0
      for (const employeeId of employeeIds) {
        const isRespondent = respondents.includes(employeeId)
        const tokenId = randomUUID()
        const usedAt = isRespondent ? addHours(waveDate, rand(1, 30)) : null
        const shortCode = nextShortCode()

        await prisma.climateSurveyResponseToken.create({
          data: {
            id: tokenId,
            tenantId: context.tenantId,
            dispatchId,
            employeeId,
            token: randomUUID(),
            shortCode,
            expiresAt: addDays(waveDate, 5),
            workStartTime: profile.workStartTime,
            workEndTime: profile.workEndTime,
            usedAt,
            reminderSentAt: isRespondent ? null : addHours(waveDate, 48),
            createdAt: waveDate,
          },
        })

        if (!isRespondent || usedAt === null) {
          if (nonRespondentIndex < 2) {
            const startedAt = addHours(waveDate, 20 + nonRespondentIndex)
            await prisma.climateSurveyResponseSession.create({
              data: {
                id: randomUUID(),
                tenantId: context.tenantId,
                dispatchId,
                tokenId,
                startedAt,
                completedAt: null,
                lastQuestionOrder: rand(2, 9),
                lastQuestionId: questionIds[rand(1, 8)] ?? null,
                questionCount: questionIds.length,
              },
            })
            analyticsRows.push({
              id: randomUUID(),
              tenantId: context.tenantId,
              event: "resposta_iniciada",
              configId: config.id,
              dispatchId,
              sessionId: tokenId,
              quantity: 1,
              createdAt: startedAt,
            })
          }
          nonRespondentIndex += 1
          continue
        }

        const person = context.employees.find((employee) => employee.id === employeeId)
        const departmentBias = profile.deptName === "Operações" ? -0.2 : profile.deptName === "Comercial" ? -0.08 : 0.06
        const archetypeRoll = random()
        const isPromoter = archetypeRoll < definition.promoterShare
        const isDetractor = archetypeRoll > 1 - definition.detractorShare
        const archetypeMean = isPromoter ? 4.95 : isDetractor ? 3.2 : 4.3
        const biasScale = isPromoter ? 0.3 : 1
        const base = clamp(archetypeMean + departmentBias, 1, 5)
        const normalizedScores: number[] = []
        const responseId = randomUUID()

        for (let questionIndex = 0; questionIndex < questionIds.length; questionIndex += 1) {
          const dimension = CLIMATE_QUESTIONS[questionIndex]?.dimension ?? "organizational_culture"
          const dimensionBias = CLIMATE_DIMENSION_BIAS[dimension] ?? 0
          const normalized = clamp(Math.round(base + dimensionBias * biasScale + (random() - 0.5) * 0.6), 1, 5)
          normalizedScores.push(normalized)
        }

        const averageNormalized = normalizedScores.reduce((sum, value) => sum + value, 0) / normalizedScores.length
        const note = averageNormalized * 2
        const enpsCategory = note >= 9 ? "promoter" : note >= 7 ? "neutral" : "detractor"
        if (enpsCategory === "promoter") promoters += 1
        if (enpsCategory === "detractor") detractors += 1

        await prisma.climateSurveyResponse.create({
          data: {
            id: responseId,
            tenantId: context.tenantId,
            dispatchId,
            departmentId,
            enpsCategory,
            openComment: random() < 0.25 ? pick(CLIMATE_COMMENTS) : null,
            createdAt: setMinutes(setHours(usedAt, 0), 0),
          },
        })

        for (let index = 0; index < questionIds.length; index += 1) {
          const questionId = questionIds[index]
          const normalized = normalizedScores[index]
          if (!questionId || normalized === undefined) continue
          await prisma.climateSurveyResponseItem.create({
            data: {
              id: randomUUID(),
              climateSurveyResponseId: responseId,
              questionId,
              score: normalized,
            },
          })
        }

        const startedAt = addHours(usedAt, -0.05)
        await prisma.climateSurveyResponseSession.create({
          data: {
            id: randomUUID(),
            tenantId: context.tenantId,
            dispatchId,
            tokenId,
            startedAt,
            completedAt: usedAt,
            lastQuestionId: questionIds[questionIds.length - 1] ?? null,
            lastQuestionOrder: questionIds.length,
            questionCount: questionIds.length,
          },
        })

        analyticsRows.push(
          {
            id: randomUUID(),
            tenantId: context.tenantId,
            event: "resposta_iniciada",
            configId: config.id,
            dispatchId,
            sessionId: tokenId,
            quantity: 1,
            createdAt: startedAt,
          },
          {
            id: randomUUID(),
            tenantId: context.tenantId,
            event: "resposta_concluida",
            configId: config.id,
            dispatchId,
            sessionId: tokenId,
            quantity: 1,
            createdAt: usedAt,
          },
        )

        if (person && random() < 0.55) {
          const emailLogId = randomUUID()
          const trackingToken = randomUUID()
          const sentAt = addHours(waveDate, rand(0, 2))
          const openedAt = random() < 0.7 ? addHours(sentAt, rand(1, 20)) : null
          const clickedAt = openedAt && random() < 0.75 ? addHours(openedAt, rand(0, 2)) : null
          emailLogRows.push({
            id: emailLogId,
            tenantId: context.tenantId,
            employeeId,
            dispatchId,
            type: "climate_survey_dispatch",
            provider: "console",
            externalId: `email_${randomUUID().slice(0, 12)}`,
            recipientEmail: person.email,
            surveyLink: `${env.NEXT_PUBLIC_APP_URL}/climate-survey/${MAIN_SLUG}/${shortCode}`,
            trackingToken,
            status: clickedAt ? "clicked" : openedAt ? "opened" : "sent",
            sentAt,
            openedAt,
            clickedAt,
            queueJobId: `email-job-${randomUUID().slice(0, 8)}`,
          })
          if (openedAt) {
            analyticsRows.push({
              id: randomUUID(),
              tenantId: context.tenantId,
              event: "email_aberto",
              configId: config.id,
              dispatchId,
              emailLogId,
              quantity: 1,
              createdAt: openedAt,
            })
          }
          if (clickedAt) {
            analyticsRows.push({
              id: randomUUID(),
              tenantId: context.tenantId,
              event: "link_clicado",
              configId: config.id,
              dispatchId,
              emailLogId,
              quantity: 1,
              createdAt: clickedAt,
            })
          }
        }
      }
    }

    analyticsRows.push({
      id: randomUUID(),
      tenantId: context.tenantId,
      event: "lembrete_disparado",
      configId: config.id,
      dispatchId,
      quantity: Math.max(0, waveRecipients - waveResponses),
      createdAt: addHours(waveDate, 48),
    })

    const enps = waveResponses > 0 ? Math.round(((promoters - detractors) / waveResponses) * 100) : 0
    logger.info(
      `  Onda ${format(waveDate, "dd/MM/yyyy")}: ${waveResponses}/${waveRecipients} respostas, eNPS ${enps}.`,
    )
  }

  if (emailLogRows.length > 0) {
    await prisma.emailLog.createMany({ data: emailLogRows })
  }
  await prisma.climateSurveyAnalyticsEvent.createMany({ data: analyticsRows })

  return waves
}

async function seedClimateActionPlans(context: SeedContext, waves: ClimateWave[]): Promise<void> {
  const latestWave = waves[waves.length - 1]
  const comparisonWave = waves[waves.length - 2]
  if (!latestWave || !comparisonWave) return

  const plan = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      climateSurveyDispatchId: latestWave.dispatchId,
      climateSurveyDimension: "leadership_trust",
      assigneeId: context.adminUserId,
      title: "Fortalecer confiança na liderança — Operações e Financeiro",
      description:
        "A confiança na liderança ficou 9 pontos abaixo da meta na última onda. Plano estruturado de comunicação, feedback e desenvolvimento de gestores.",
      status: "in_progress",
      priority: "high",
      dueDate: addDays(NOW, 45),
      createdAt: addDays(NOW, -6),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan.id, title: "Formação de líderes em feedback contínuo", assigneeId: context.rhUserId, dueDate: addDays(NOW, 15), completedAt: null },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan.id, title: "Encontros mensais de escuta com cada equipe", assigneeId: context.adminUserId, dueDate: addDays(NOW, 10), completedAt: addDays(NOW, -1) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan.id, title: "Painel transparente de decisões e resultados", assigneeId: context.adminUserId, dueDate: addDays(NOW, 30), completedAt: null },
    ],
  })

  const plan2 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      climateSurveyDispatchId: comparisonWave.dispatchId,
      climateSurveyDimension: "work_life_balance",
      assigneeId: context.rhUserId,
      title: "Programa de equilíbrio vida-trabalho",
      description:
        "Equilíbrio vida-trabalho abaixo da meta nas ondas anteriores. Implementação de flexibilidade e limites de jornada.",
      status: "completed",
      priority: "medium",
      dueDate: addDays(NOW, -20),
      completedAt: addDays(NOW, -18),
      createdAt: addDays(NOW, -95),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan2.id, title: "Política de reuniões até 17h30", assigneeId: context.adminUserId, dueDate: addDays(NOW, -40), completedAt: addDays(NOW, -42) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan2.id, title: "Modelo híbrido com 2 dias remotos", assigneeId: context.rhUserId, dueDate: addDays(NOW, -30), completedAt: addDays(NOW, -31) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan2.id, title: "Campanha de desconexão digital", assigneeId: context.rhUserId, dueDate: addDays(NOW, -22), completedAt: addDays(NOW, -20) },
    ],
  })

  await prisma.climateSurveyActionSuggestion.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        dispatchId: latestWave.dispatchId,
        dimension: "internal_communication",
        what: "Criar boletim quinzenal com decisões, resultados e próximos passos",
        why: "Comunicação Interna fechou em 64%, 6 pontos abaixo da meta corporativa de 70%.",
        who: "RH + Comunicação Interna",
        where: "Todos os setores, com reforço em Operações",
        when: "Início em 15 dias, primeira edição em 30 dias",
        how: "Boletim em formato digital, pauta construída com representantes de cada setor e espaço fixo para perguntas.",
        cost: null,
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        dispatchId: latestWave.dispatchId,
        dimension: "recognition_reward",
        what: "Programa de reconhecimento entre pares com ciclo trimestral",
        why: "Reconhecimento e Recompensa ficou em 61%, 9 pontos abaixo da meta.",
        who: "RH + lideranças de setor",
        where: "Empresa inteira",
        when: "Piloto em 21 dias, avaliação em 90 dias",
        how: "Canal simples de indicação entre pares, com critérios públicos e premiação simbólica por ciclo.",
        cost: null,
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        dispatchId: latestWave.dispatchId,
        dimension: "professional_development",
        what: "Trilhas de desenvolvimento por área com mentoria interna",
        why: "Desenvolvimento Profissional ficou em 66%, abaixo da meta, com pior avaliação em Financeiro.",
        who: "RH + gestores de área",
        where: "Financeiro e Operações prioritariamente",
        when: "Diagnóstico em 30 dias, primeiras trilhas em 60 dias",
        how: "Mapeamento de competências, plano individual e encontros mensais de mentoria com lideranças sênior.",
        cost: null,
        status: "rejected",
        rejectedReason: "Já existe um programa corporativo de trilhas em implantação neste semestre.",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        dispatchId: latestWave.dispatchId,
        dimension: "work_life_balance",
        what: "Política de desconexão digital fora do horário",
        why: "Equilíbrio Vida Pessoal e Profissional ficou abaixo da meta, com piora em Operações e Logística.",
        who: "RH + lideranças",
        where: "Todos os setores",
        when: "Comunicado em 7 dias, efetivo em 30 dias",
        how: "Definir janelas de contato, desativar notificações fora do turno e acompanhar adesão por setor.",
        cost: null,
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        dispatchId: latestWave.dispatchId,
        dimension: "job_satisfaction",
        what: "Revisão participativa das metas e prioridades do trimestre",
        why: "Satisfação no Trabalho caiu no Atendimento e Comercial após aumento de metas.",
        who: "Alta liderança + RH",
        where: "Atendimento e Comercial",
        when: "Oficinas em 20 dias, revisão em 45 dias",
        how: "Oficinas com representantes das equipes para revisar metas, prazos e critérios de priorização.",
        cost: null,
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        dispatchId: latestWave.dispatchId,
        dimension: "psychological_safety",
        what: "Formação em segurança psicológica para lideranças",
        why: "Segurança Psicológica ficou abaixo da meta, com relatos de medo de represália.",
        who: "RH + lideranças de todos os setores",
        where: "Empresa inteira",
        when: "Primeira turma em 30 dias",
        how: "Formação prática com estudos de caso, pacto de convivência e canal seguro de feedback.",
        cost: null,
        status: "pending",
      },
    ],
  })

  const acceptedSuggestion = await prisma.climateSurveyActionSuggestion.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      dispatchId: latestWave.dispatchId,
      dimension: "leadership_trust",
      what: "Programa de desenvolvimento de lideranças com foco em confiança",
      why: "Confiança na Liderança fechou em 68%, 2 pontos abaixo da meta, com Operações em 59%.",
      who: "RH + alta liderança",
      where: "Operações e Financeiro",
      when: "Início imediato, ciclos mensais por 6 meses",
      how: "Formação prática, feedback 360 e rituais de escuta com as equipes.",
      cost: null,
      status: "accepted",
      actionPlanId: plan.id,
    },
  })
  const activeClimateConfig = await prisma.climateSurveyConfiguration.findFirst({
    where: { tenantId: context.tenantId, isActive: true },
  })
  if (activeClimateConfig) {
    await prisma.climateSurveyAnalyticsEvent.createMany({
      data: [
        {
          id: randomUUID(),
          tenantId: context.tenantId,
          event: "acao_criada",
          configId: activeClimateConfig.id,
          dispatchId: latestWave.dispatchId,
          actionPlanId: plan.id,
          quantity: 1,
          createdAt: addDays(NOW, -6),
        },
        {
          id: randomUUID(),
          tenantId: context.tenantId,
          event: "acao_criada",
          configId: activeClimateConfig.id,
          dispatchId: comparisonWave.dispatchId,
          actionPlanId: plan2.id,
          quantity: 1,
          createdAt: addDays(NOW, -95),
        },
        {
          id: randomUUID(),
          tenantId: context.tenantId,
          event: "acao_concluida",
          configId: activeClimateConfig.id,
          dispatchId: comparisonWave.dispatchId,
          actionPlanId: plan2.id,
          quantity: 1,
          createdAt: addDays(NOW, -18),
        },
      ],
    })
  }

  logger.info(`Sugestão aceita vinculada ao plano: ${acceptedSuggestion.id.slice(0, 8)}`)
}

async function seedActionPlansAndSuggestions(context: SeedContext): Promise<void> {
  logger.info("Criando planos de ação, sugestões, documentos e relatos...")

  const tecnologyId = context.deptMap["Tecnologia"] ?? ""
  const financeId = context.deptMap["Financeiro"] ?? ""
  const operationsId = context.deptMap["Operações"] ?? ""
  const supportId = context.deptMap["Suporte"] ?? ""

  const plan1 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      title: "Reduzir sobrecarga e restaurar bem-estar — Tecnologia",
      description:
        "Score de bem-estar em Tecnologia caiu de 4,1 para 2,8 durante um projeto de grande porte. Este plano implementa rituais de bem-estar, limite de horas extras e canal de feedback contínuo.",
      status: "completed",
      priority: "high",
      dueDate: addWeeks(START, 80),
      completedAt: addWeeks(START, 83),
      createdAt: addWeeks(START, 71),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan1.id, title: "Retrospectiva quinzenal de bem-estar", assigneeId: context.rhUserId, dueDate: addWeeks(START, 73), completedAt: addWeeks(START, 72) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan1.id, title: "Limitar horas extras a 4h por semana", assigneeId: context.adminUserId, dueDate: addWeeks(START, 75), completedAt: addWeeks(START, 76) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan1.id, title: "Canal direto de feedback com gestores", assigneeId: context.rhUserId, dueDate: addWeeks(START, 77), completedAt: addWeeks(START, 78) },
    ],
  })

  const plan2 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      title: "Reverter tendência negativa — Financeiro",
      description:
        "Score do Financeiro declina continuamente nos últimos meses. Análise aponta pressão por fechamentos mensais, metas irreais e falta de reconhecimento.",
      status: "in_progress",
      priority: "high",
      dueDate: addDays(NOW, 30),
      createdAt: addDays(NOW, -14),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan2.id, title: "1:1s individuais com toda a equipe", assigneeId: context.rhUserId, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan2.id, title: "Revisão das metas de fechamento contábil", assigneeId: context.adminUserId, dueDate: addDays(NOW, 14), completedAt: null },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan2.id, title: "Programa de reconhecimento mensal", assigneeId: context.rhUserId, dueDate: addDays(NOW, 21), completedAt: addDays(NOW, -2) },
    ],
  })

  const plan3 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      title: "Intervenção emergencial — Operações",
      description:
        "Score abaixo de 2,2 por várias semanas, adesão baixa e relatos anônimos de sobrecarga e conflitos com lideranças. Plano de emergência com ações imediatas.",
      status: "open",
      priority: "high",
      dueDate: addDays(NOW, 15),
      createdAt: addDays(NOW, -5),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan3.id, title: "Reunião de escuta ativa com Operações", assigneeId: context.adminUserId, dueDate: addDays(NOW, 3), completedAt: null },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan3.id, title: "Avaliação ergonômica do ambiente físico", assigneeId: context.rhUserId, dueDate: addDays(NOW, 5), completedAt: null },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan3.id, title: "Revisão da escala de turnos e banco de horas", assigneeId: context.adminUserId, dueDate: addDays(NOW, 7), completedAt: null },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan3.id, title: "Mediação de conflitos identificados", assigneeId: context.rhUserId, dueDate: addDays(NOW, 10), completedAt: null },
    ],
  })

  const plan4 = await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      title: "Melhorias ergonômicas — Operações",
      description:
        "Pesquisa de ergonomia detectou score 2,4 no ambiente físico. Colaboradores relatam dores nas costas e equipamentos deteriorados.",
      status: "completed",
      priority: "medium",
      dueDate: addWeeks(START, 68),
      completedAt: addWeeks(START, 72),
      createdAt: addWeeks(START, 58),
    },
  })
  await prisma.actionPlanTask.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan4.id, title: "Laudo de ergonomia especializado", assigneeId: context.adminUserId, dueDate: addWeeks(START, 60), completedAt: addWeeks(START, 61) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan4.id, title: "Substituição de 9 cadeiras e ajuste de mesas", assigneeId: context.adminUserId, dueDate: addWeeks(START, 64), completedAt: addWeeks(START, 65) },
      { id: randomUUID(), tenantId: context.tenantId, actionPlanId: plan4.id, title: "Ginástica laboral 2x por semana", assigneeId: context.rhUserId, dueDate: addWeeks(START, 66), completedAt: addWeeks(START, 67) },
    ],
  })

  await prisma.actionPlan.create({
    data: {
      id: randomUUID(),
      tenantId: context.tenantId,
      title: "Engajamento e adesão às pesquisas — Suporte",
      description:
        "Adesão às pesquisas em Suporte caiu de 87% para 74% após o 14º mês. A análise sugere sobrecarga de atendimento e falta de clareza sobre a importância da participação.",
      status: "in_progress",
      priority: "medium",
      dueDate: addDays(NOW, 25),
      createdAt: addDays(NOW, -21),
    },
  })

  const extraPlanSeeds = [
    { dept: "Atendimento", title: "Reduzir tempo de espera e sobrecarga no atendimento", status: "in_progress", priority: "high" },
    { dept: "Logística", title: "Revisar escala de turnos e pausas da logística", status: "open", priority: "high" },
    { dept: "Operações", title: "Programa de acolhimento pós-incidente", status: "completed", priority: "critical" },
    { dept: "Tecnologia", title: "Ritual de desconexão e limite de horas extras", status: "completed", priority: "medium" },
    { dept: "Comercial", title: "Preparação para o pico de metas do fim do ano", status: "in_progress", priority: "medium" },
    { dept: "Financeiro", title: "Redesenho do processo de fechamento mensal", status: "open", priority: "high" },
    { dept: "Recursos Humanos", title: "Programa de escuta ativa e clima contínuo", status: "in_progress", priority: "medium" },
    { dept: "Marketing", title: "Limites de reuniões e blocos de foco", status: "completed", priority: "low" },
    { dept: "Produto", title: "Ritual de priorização e redução de retrabalho", status: "open", priority: "medium" },
    { dept: "Qualidade", title: "Treinamento em segurança psicológica", status: "in_progress", priority: "medium" },
    { dept: "Jurídico", title: "Revisão da política de assédio e canais de denúncia", status: "completed", priority: "high" },
    { dept: "Suporte", title: "Ampliação da equipe e rodízio de plantões", status: "open", priority: "high" },
  ]

  for (let index = 0; index < extraPlanSeeds.length; index += 1) {
    const seed = extraPlanSeeds[index]
    if (!seed) continue
    const completed = seed.status === "completed"
    const dueOffset = seed.status === "open" ? -5 - index : 20 + index * 3
    const plan = await prisma.actionPlan.create({
      data: {
        id: randomUUID(),
        tenantId: context.tenantId,
        title: seed.title,
        description: `Ação estruturada para o setor de ${seed.dept}, com base no histórico de pesquisas, relatos e indicadores de workforce.`,
        status: seed.status,
        priority: seed.priority === "critical" ? "high" : seed.priority,
        dueDate: completed ? addDays(NOW, -20 - index) : addDays(NOW, dueOffset),
        completedAt: completed ? addDays(NOW, -18 - index) : null,
        createdAt: addDays(NOW, -40 - index * 4),
      },
    })
    const taskCount = 3 + (index % 3)
    const taskRows: Prisma.ActionPlanTaskCreateManyInput[] = []
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) {
      const taskCompleted = completed || taskIndex < index % 3
      taskRows.push({
        id: randomUUID(),
        tenantId: context.tenantId,
        actionPlanId: plan.id,
        title: `Etapa ${taskIndex + 1}: ${["diagnóstico", "alinhamento com liderança", "execução piloto", "medição de resultado", "comunicação e follow-up"][taskIndex] ?? "ação de melhoria"}`,
        assigneeId: taskIndex % 2 === 0 ? context.rhUserId : context.adminUserId,
        dueDate: addDays(NOW, taskIndex * 7 - 10),
        completedAt: taskCompleted ? addDays(NOW, taskIndex * 7 - 15) : null,
      })
    }
    await prisma.actionPlanTask.createMany({ data: taskRows })
  }

  await prisma.actionPlanSuggestion.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-negative_trend-${financeId}`,
        title: "Plano de melhoria contínua — Financeiro",
        description:
          "Tendência negativa persistente no setor Financeiro. O índice de saúde cai consistentemente há 3+ períodos, aumentando o risco de burnout e comprometendo a conformidade com a NR-1.",
        priority: "high",
        reason: "Tendência negativa persistente no setor Financeiro — 3 períodos consecutivos abaixo da média histórica",
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-no_response-${operationsId}`,
        title: "Aumentar adesão às pesquisas — Operações",
        description:
          "Taxa de adesão em Operações abaixo de 55% por 5 semanas. Baixa participação compromete a representatividade dos dados e a integridade do programa de monitoramento.",
        priority: "high",
        reason: "Adesão crítica em Operações — abaixo do mínimo aceitável de 80%",
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-low_score-${supportId}`,
        title: "Revisar carga de atendimento — Suporte",
        description:
          "Setor de Suporte com score em queda e adesão reduzida. A combinação indica sobrecarga e possível desengajamento com o programa.",
        priority: "medium",
        reason: "Score e adesão em queda simultânea no setor de Suporte",
        status: "dismissed",
        dismissedAt: subMonths(NOW, 2),
        dismissedBy: context.adminUserId,
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-low_score-${tecnologyId}`,
        title: "Intervenção de bem-estar — Tecnologia",
        description:
          "Queda abrupta de score em Tecnologia durante projeto de grande porte. Score caiu de 4,1 para 2,8 em 8 semanas — maior queda registrada na organização.",
        priority: "high",
        reason: "Queda de score acima de 2,0 pontos em Tecnologia — alerta crítico",
        status: "converted",
        actionPlanId: plan1.id,
      },
    ],
  })

  await prisma.actionPlanSuggestion.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-low_score-atendimento`,
        title: "Reduzir sobrecarga no Atendimento",
        description: "Score e adesão em queda no Atendimento. A equipe relata volume crescente de chamados sem ampliação do time.",
        priority: "high",
        reason: "Score abaixo de 3,0 e adesão abaixo de 70% no Atendimento",
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-low_score-logistica`,
        title: "Revisar escala e pausas da Logística",
        description: "Queda de score após mudança de escala. Colaboradores relatam jornadas longas e pausas insuficientes.",
        priority: "high",
        reason: "Queda superior a 1 ponto no score da Logística",
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-negative_trend-operacoes`,
        title: "Plano de recuperação de bem-estar — Operações",
        description: "Operações acumula períodos consecutivos abaixo da média histórica, com impactos em absenteísmo e relatos.",
        priority: "high",
        reason: "Tendência negativa persistente em Operações",
        status: "pending",
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        suggestionKey: `alert-low_adherence-atendimento`,
        title: "Campanha de participação nas pesquisas — Atendimento",
        description: "Adesão abaixo do mínimo no Atendimento, comprometendo a leitura dos indicadores do setor.",
        priority: "medium",
        reason: "Adesão abaixo de 80% por múltiplas semanas",
        status: "pending",
      },
    ],
  })

  const allSuggestions = await prisma.actionPlanSuggestion.findMany({ where: { tenantId: context.tenantId } })
  const suggestionTaskRows: Prisma.ActionPlanSuggestionTaskCreateManyInput[] = []
  for (const suggestion of allSuggestions) {
    const titles = [
      "Diagnóstico rápido com liderança do setor",
      "Definir responsáveis e prazos",
      "Comunicar plano e medir adesão",
      "Revisar resultado após 30 dias",
    ]
    for (let taskIndex = 0; taskIndex < 3; taskIndex += 1) {
      suggestionTaskRows.push({
        id: randomUUID(),
        suggestionId: suggestion.id,
        title: titles[taskIndex] ?? "Ação de melhoria",
        sortOrder: taskIndex,
      })
    }
  }
  await prisma.actionPlanSuggestionTask.createMany({ data: suggestionTaskRows })

  const documents = [
    { title: "Programa de Gerenciamento de Riscos (PGR) — 2026", type: "pgr" },
    { title: "Programa de Gerenciamento de Riscos (PGR) — 2025", type: "pgr" },
    { title: "Programa de Gerenciamento de Riscos (PGR) — 2024", type: "pgr" },
    { title: "Manual de Segurança e Saúde Ocupacional", type: "manual" },
    { title: "Plano de Ação Corretiva — Operações", type: "action_plan" },
    { title: "Relatório de Incidentes — Último trimestre", type: "report" },
    { title: "Treinamento NR-1: Riscos Psicossociais", type: "training" },
    { title: "Política de Bem-Estar e Saúde Mental", type: "policy" },
    { title: "Ata de Reunião CIPA — Ciclo atual", type: "meeting_minutes" },
    { title: "Laudo Ergonômico — Operações", type: "report" },
    { title: "Acordo de Metas Revisado — Financeiro", type: "policy" },
    { title: "PCMSO — Programa de Controle Médico", type: "pcmso" },
    { title: "Política de Trabalho Híbrido e Home Office", type: "policy" },
    { title: "Relatório de Auditoria Interna de SST", type: "audit" },
    { title: "Plano de Emergência e Evacuação", type: "emergency_plan" },
    { title: "Treinamento de Liderança Humanizada", type: "training" },
    { title: "Consolidado da Pesquisa de Clima — Última onda", type: "report" },
    { title: "Relatório de Turnover e Absenteísmo", type: "report" },
    { title: "Matriz de Riscos Psicossociais", type: "risk_matrix" },
    { title: "Inventário de Equipamentos de Proteção", type: "inventory" },
    { title: "Laudo de Insalubridade — Área Industrial", type: "report" },
    { title: "Ata do Comitê de Ética e Conduta", type: "meeting_minutes" },
    { title: "Política de Diversidade e Inclusão", type: "policy" },
    { title: "Relatório Anual de Saúde e Segurança", type: "report" },
  ]
  const storage = getStorageService()
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index]
    if (!document) continue
    const documentId = randomUUID()
    const latestKey = `documents/${context.tenantId}/${documentId}-v1.pdf`
    const latestPdf = buildSimplePdf(document.title, `Tipo: ${document.type} · versão 1`)
    await storage.upload({
      file: new File([latestPdf.toString("latin1")], `${documentId}-v1.pdf`, { type: "application/pdf" }),
      path: latestKey,
    })

    const versions: Prisma.DocumentVersionCreateWithoutDocumentInput[] = [
      {
        id: randomUUID(),
        version: 1,
        fileUrl: latestKey,
        uploadedBy: { connect: { id: context.adminUserId } },
        createdAt: subMonths(NOW, 11 - Math.min(index, 10)),
      },
    ]

    let documentFileUrl = latestKey
    if (index % 4 === 0) {
      const previousKey = `documents/${context.tenantId}/${documentId}-v2.pdf`
      const previousPdf = buildSimplePdf(document.title, `Tipo: ${document.type} · versão 2 (revisada)`)
      await storage.upload({
        file: new File([previousPdf.toString("latin1")], `${documentId}-v2.pdf`, { type: "application/pdf" }),
        path: previousKey,
      })
      versions.push({
        id: randomUUID(),
        version: 2,
        fileUrl: previousKey,
        uploadedBy: { connect: { id: context.rhUserId } },
        createdAt: subMonths(NOW, 4 - (index % 3)),
      })
      documentFileUrl = previousKey
    }

    await prisma.document.create({
      data: {
        id: documentId,
        tenantId: context.tenantId,
        title: document.title,
        type: document.type,
        fileUrl: documentFileUrl,
        isActive: true,
        createdAt: subMonths(NOW, 12 - Math.min(index, 11)),
        versions: { create: versions },
      },
    })
  }

  await prisma.anonymousReport.createMany({
    data: [
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Pressão enorme para entregar resultados impossíveis em prazos irreais. Isso está afetando meu sono e minha saúde física.", category: "overload", status: "resolved", resolvedAt: addWeeks(START, 38), createdAt: addWeeks(START, 34), updatedAt: addWeeks(START, 38) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Comentários inapropriados de um colega criam um ambiente hostil. Já aconteceu mais de uma vez na frente de outros.", category: "harassment", status: "resolved", resolvedAt: addWeeks(START, 20), createdAt: addWeeks(START, 16), updatedAt: addWeeks(START, 20) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "As cadeiras e mesas na área de operações estão causando dores nas costas. Precisamos de ergonomia adequada urgentemente.", category: "physical_environment", status: "resolved", resolvedAt: addWeeks(START, 68), createdAt: addWeeks(START, 59), updatedAt: addWeeks(START, 68) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Conflito sério entre dois líderes afetando toda a equipe. Precisamos de mediação profissional urgente.", category: "conflict", status: "analyzing", resolvedAt: null, createdAt: addWeeks(START, 55), updatedAt: addWeeks(START, 54) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "O volume de reuniões está excessivo. Passamos mais tempo em reunião do que trabalhando de verdade.", category: "overload", status: "resolved", resolvedAt: addWeeks(START, 48), createdAt: addWeeks(START, 44), updatedAt: addWeeks(START, 48) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Me sinto mal com o nível de cobrança e microgerenciamento. Não tenho autonomia para fazer meu trabalho.", category: "management", status: "resolved", resolvedAt: addWeeks(START, 82), createdAt: addWeeks(START, 78), updatedAt: addWeeks(START, 82) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "A temperatura do escritório está insuportável no verão. O ar-condicionado não funciona adequadamente na ala leste.", category: "physical_environment", status: "resolved", resolvedAt: addWeeks(START, 12), createdAt: addWeeks(START, 8), updatedAt: addWeeks(START, 12) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "As metas do setor financeiro são determinadas sem levar em conta a realidade operacional. Isso gera estresse crônico.", category: "overload", status: "analyzing", resolvedAt: null, createdAt: addWeeks(START, 90), updatedAt: addWeeks(START, 89) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Me sinto invisível no time. Minha contribuição nunca é reconhecida publicamente, mesmo quando os resultados são bons.", category: "other", status: "open", resolvedAt: null, createdAt: addDays(NOW, -18), updatedAt: addDays(NOW, -18) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "O onboarding de novos colaboradores de Suporte é inexistente. Estou há 2 meses sem treinamento adequado.", category: "other", status: "open", resolvedAt: null, createdAt: addDays(NOW, -12), updatedAt: addDays(NOW, -12) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Há favoritismo explícito na distribuição de projetos premium. Sempre as mesmas pessoas recebem as oportunidades melhores.", category: "conflict", status: "analyzing", resolvedAt: null, createdAt: addDays(NOW, -6), updatedAt: addDays(NOW, -5) },
      { id: randomUUID(), tenantId: context.tenantId, orgSlug: MAIN_SLUG, content: "Sinto que não aguento mais a pressão. Tenho pensamentos negativos recorrentes e não consigo dormir há semanas.", category: "mental_health", status: "open", resolvedAt: null, createdAt: addHours(NOW, -18), updatedAt: addHours(NOW, -18) },
    ],
  })

  const extraReportContents = [
    { content: "A escala de plantão muda em cima da hora e isso está desorganizando minha vida pessoal.", category: "overload", status: "resolved" },
    { content: "Sinto que a liderança não escuta quando apontamos problemas operacionais.", category: "management", status: "analyzing" },
    { content: "Falta de treinamento adequado para usar o novo sistema de atendimento.", category: "other", status: "open" },
    { content: "O espaço de descanso foi transformado em sala de reunião e não temos mais pausa.", category: "physical_environment", status: "resolved" },
    { content: "Há comentários desrespeitosos sobre aparência e sotaque de colegas.", category: "harassment", status: "analyzing" },
    { content: "Metas inalcançáveis no comercial estão gerando ansiedade em toda a equipe.", category: "overload", status: "resolved" },
    { content: "Meu gestor faz cobranças fora do horário de trabalho com frequência.", category: "management", status: "open" },
    { content: "O processo de promoção não é transparente e gera desmotivação.", category: "other", status: "analyzing" },
    { content: "Faltam equipamentos de proteção adequados para a atividade de manutenção.", category: "safety", status: "resolved" },
    { content: "Sou constantemente interrompido durante o home office e não consigo concentrar.", category: "other", status: "resolved" },
    { content: "A comunicação entre o turno da noite e o diurno é falha e gera retrabalho.", category: "other", status: "analyzing" },
    { content: "Presenciei favoritismo em escalas de folga e distribuição de turnos.", category: "discrimination", status: "open" },
    { content: "A pressão por produtividade está afetando meu sono e meu apetite.", category: "mental_health", status: "analyzing" },
    { content: "O ar-condicionado da sala de operação está quebrado há mais de um mês.", category: "physical_environment", status: "resolved" },
    { content: "Não há canal claro para denunciar assédio sem medo de retaliação.", category: "harassment", status: "analyzing" },
    { content: "A troca de gestor trouxe mudanças bruscas de processo sem treinamento.", category: "management", status: "open" },
    { content: "O volume de chamados no atendimento cresceu e a equipe não foi ampliada.", category: "overload", status: "analyzing" },
    { content: "Sinto falta de reconhecimento pelo esforço extra nos fechamentos.", category: "other", status: "resolved" },
    { content: "As reuniões de equipe são usadas para expor erros individualmente.", category: "management", status: "open" },
    { content: "O transporte fornecido pela empresa atrasa e afeta o início do turno.", category: "safety", status: "resolved" },
  ]
  await prisma.anonymousReport.createMany({
    data: extraReportContents.map((report, index) => {
      const createdAt = addDays(NOW, -rand(3, 260) - index)
      const resolved = report.status === "resolved"
      return {
        id: randomUUID(),
        tenantId: context.tenantId,
        orgSlug: MAIN_SLUG,
        content: report.content,
        category: report.category,
        status: report.status,
        resolvedAt: resolved ? addDays(createdAt, rand(2, 25)) : null,
        createdAt,
        updatedAt: resolved ? addDays(createdAt, rand(2, 25)) : createdAt,
      }
    }),
  })

  logger.success(`Planos de ação, sugestões, ${documents.length} documentos com arquivo e ${12 + extraReportContents.length} relatos criados.`)
}

async function seedPgr(context: SeedContext): Promise<void> {
  logger.info("Criando revisões PGR com resultados por setor e pergunta...")

  const periods: { period: string; reviewedAt: Date }[] = []
  for (let index = 4; index >= 0; index -= 1) {
    const month = startOfMonth(subMonths(NOW, index * 3 + 1))
    const periodDate = endOfMonth(month)
    periods.push({ period: format(periodDate, "yyyy-MM"), reviewedAt: periodDate })
  }

  for (const entry of periods) {
    const reviewId = randomUUID()
    await prisma.pgrReview.create({
      data: {
        id: reviewId,
        tenantId: context.tenantId,
        period: entry.period,
        status: "completed",
        reviewedAt: entry.reviewedAt,
        nextReviewAt: addMonths(entry.reviewedAt, 6),
        createdAt: entry.reviewedAt,
      },
    })

    const deptRows: Prisma.PgrDeptResultCreateManyInput[] = []
    const questionRows: Prisma.PgrQuestionResultCreateManyInput[] = []

    for (const profile of DEPT_PROFILES) {
      const departmentId = context.deptMap[profile.deptName]
      if (!departmentId) continue
      const averageScore = clamp(profile.baseScore(DEPT_PROFILES.indexOf(profile) + rand(10, 60)))
      const responseCount = Math.round(profile.employeeCount * 0.82)

      deptRows.push({
        id: randomUUID(),
        pgrReviewId: reviewId,
        departmentId,
        departmentName: profile.deptName,
        employeeCount: profile.employeeCount,
        avgScore: round1(averageScore),
        responseCount,
        totalRecipients: profile.employeeCount,
        createdAt: entry.reviewedAt,
      })

      for (let index = 0; index < DEFAULT_QUESTIONS.length; index += 1) {
        const question = DEFAULT_QUESTIONS[index]
        const questionId = context.healthQuestionIds[index]
        if (!question || !questionId) continue
        questionRows.push({
          id: randomUUID(),
          pgrReviewId: reviewId,
          departmentId,
          questionId,
          questionText: question.text,
          questionOrder: index + 1,
          scoreDirection: question.direction,
          avgScore: round1(clamp(averageScore + (random() - 0.5) * 0.6)),
          responseCount,
          createdAt: entry.reviewedAt,
        })
      }
    }

    await prisma.pgrDeptResult.createMany({ data: deptRows })
    await prisma.pgrQuestionResult.createMany({ data: questionRows })
  }

  logger.success(`PGR: ${periods.length} revisões (${periods[0]?.period} → ${periods[periods.length - 1]?.period}).`)
}

interface RosterPerson {
  name: string
  document: string
  department: string
  role: string
  admissionDate: Date
  terminationDate: Date | null
  terminationType: string | null
}

function buildWorkforceRoster(): RosterPerson[] {
  const rolesByDept: Record<string, string[]> = {
    Tecnologia: ["Desenvolvedor Sênior", "Desenvolvedor Pleno", "Tech Lead", "QA Analyst", "DevOps", "Analista de Dados"],
    Comercial: ["Executivo de Contas", "SDR", "Gerente Comercial", "Inside Sales", "Customer Success"],
    "Recursos Humanos": ["Analista de RH", "Business Partner", "Especialista em DHO", "Recrutador"],
    Financeiro: ["Analista Financeiro", "Controller", "Assistente Fiscal", "Analista de FP&A"],
    Operações: ["Operador", "Supervisor de Turno", "Auxiliar Logístico", "Coordenador", "Analista de Processos"],
    Marketing: ["Analista de Marketing", "Designer", "Content Strategist", "Growth Analyst"],
    Suporte: ["Analista de Suporte", "Atendente N1", "Especialista N2", "Team Lead"],
    Logística: ["Auxiliar de Logística", "Conferente", "Supervisor de Expedição", "Motorista"],
    Jurídico: ["Advogado", "Analista Jurídico", "Compliance Officer"],
    Produto: ["Product Manager", "Product Designer", "Analista de Produto", "UX Researcher"],
    Qualidade: ["Analista de Qualidade", "Auditor Interno", "Coordenador de SGQ"],
    Atendimento: ["Atendente", "Analista de Atendimento", "Supervisor de Atendimento", "Ouvidor"],
  }
  const departments = DEPT_PROFILES.map((profile) => profile.deptName)
  const usedNames = new Set<string>()
  const names: string[] = []
  let cursor = 0
  while (names.length < 150) {
    const firstName = FIRST_NAMES[(cursor * 5) % FIRST_NAMES.length] ?? "Ana"
    const lastName = LAST_NAMES[(cursor * 13) % LAST_NAMES.length] ?? "Silva"
    const fullName = `${firstName} ${lastName}`
    cursor += 1
    if (usedNames.has(fullName)) continue
    usedNames.add(fullName)
    names.push(fullName)
  }

  const roster: RosterPerson[] = names.map((name, index) => {
    const department = departments[index % departments.length] ?? "Operações"
    const roles = rolesByDept[department] ?? ["Analista"]
    return {
      name,
      document: `${rand(100, 999)}.${rand(100, 999)}.${rand(100, 999)}-${String(rand(10, 99))}`,
      department,
      role: pick(roles),
      admissionDate: subMonths(NOW, rand(6, 48)),
      terminationDate: null,
      terminationType: null,
    }
  })

  const terminations = [
    { index: 7, monthsAgo: 6, type: "voluntary" },
    { index: 22, monthsAgo: 5, type: "involuntary" },
    { index: 38, monthsAgo: 4, type: "voluntary" },
    { index: 55, monthsAgo: 3, type: "involuntary" },
    { index: 73, monthsAgo: 2, type: "voluntary" },
    { index: 90, monthsAgo: 1, type: "involuntary" },
    { index: 108, monthsAgo: 0, type: "voluntary" },
    { index: 127, monthsAgo: 0, type: "involuntary" },
    { index: 141, monthsAgo: 4, type: "voluntary" },
  ]
  for (const termination of terminations) {
    const person = roster[termination.index]
    if (!person) continue
    person.terminationDate = termination.monthsAgo === 0 ? addDays(NOW, -rand(2, 8)) : endOfMonth(subMonths(NOW, termination.monthsAgo))
    person.terminationType = termination.type
  }

  const admissions = [
    { index: 120, monthsAgo: 5 },
    { index: 132, monthsAgo: 3 },
    { index: 144, monthsAgo: 1 },
    { index: 148, monthsAgo: 0 },
  ]
  for (const admission of admissions) {
    const person = roster[admission.index]
    if (!person) continue
    person.admissionDate = startOfMonth(subMonths(NOW, admission.monthsAgo))
  }

  return roster
}

async function seedWorkforce(context: SeedContext): Promise<void> {
  logger.info("Criando Base Master Mensal e insights de workforce...")

  const roster = buildWorkforceRoster()
  const competencias = Array.from({ length: 8 }, (_, index) => competenciaOf(subMonths(NOW, 7 - index)))
  const currentCompetencia = competencias[competencias.length - 1]
  if (!currentCompetencia) return

  for (const competencia of competencias) {
    const monthStart = startOfMonth(new Date(`${competencia}-01T00:00:00`))
    const monthEnd = endOfMonth(monthStart)

    const rows: Prisma.EmployeeMonthlyCreateManyInput[] = []
    let corrected = 0
    let hadError = false

    for (const person of roster) {
      if (person.admissionDate > monthEnd) continue
      if (person.terminationDate !== null && person.terminationDate < monthStart) continue

      const departmentBias =
        person.department === "Operações" ? 3.4
          : person.department === "Logística" ? 2.8
            : person.department === "Atendimento" ? 2.6
              : person.department === "Suporte" ? 2.1
                : 0.8
      const justified = round1(Math.max(0, random() * departmentBias))
      const unjustified = round1(random() < (person.department === "Operações" ? 0.45 : 0.18) ? random() * 2.4 : 0)
      const expectedHours = 176
      const absenceHours = justified + unjustified
      const workedHours = round1(expectedHours - absenceHours)
      const isCorrected = corrected < 2 && random() < 0.03
      if (isCorrected) corrected += 1
      const isError = !hadError && random() < 0.008
      if (isError) hadError = true

      rows.push({
        id: randomUUID(),
        tenantId: context.tenantId,
        batchId: "",
        competencia,
        employeeName: person.name,
        document: person.document,
        registration: String(10000 + roster.indexOf(person)),
        departmentName: person.department,
        roleName: person.role,
        admissionDate: person.admissionDate,
        terminationDate: person.terminationDate,
        expectedHours,
        workedHours,
        justifiedAbsenceHours: justified,
        unjustifiedAbsenceHours: unjustified,
        absenceRatePercent: round1((absenceHours / expectedHours) * 100),
        terminationType: person.terminationType,
        qualityStatus: isError ? "error" : isCorrected ? "corrected" : "validated",
        validationNotes: isError
          ? "Competência com divergência de matrícula; revisar na origem."
          : isCorrected
            ? "Horas de ausência ajustadas após validação cruzada."
            : null,
        rowHash: hash(`${competencia}:${person.document}`),
      })
    }

    const batch = await prisma.dataImportBatch.create({
      data: {
        id: randomUUID(),
        tenantId: context.tenantId,
        fileName: `espelho-ponto-${competencia}.csv`,
        fileUrl: `workforce/${context.tenantId}/${competencia}.csv`,
        fileType: "espelho",
        competencia,
        status: "validated",
        aiProvider: "gemini",
        totalRecords: rows.length,
        correctedRecords: corrected,
        errorRecords: hadError ? 1 : 0,
        createdById: context.adminUserId,
        createdAt: addDays(monthStart, 3),
      },
    })

    await prisma.employeeMonthly.createMany({
      data: rows.map((row) => ({ ...row, batchId: batch.id })),
    })
  }

  await prisma.workforceInsight.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "root_cause",
        severity: "high",
        departmentName: "Operações",
        title: "Absenteísmo elevado associado a carga operacional e baixa confiança na liderança",
        description:
          "Operações combina o maior absenteísmo do período com o menor score de clima. O padrão indica sobrecarga de turnos e desgaste na relação com a liderança como causas prováveis.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "burnout_risk",
        severity: "high",
        departmentName: "Operações",
        title: "Risco elevado de burnout no turno operacional",
        description:
          "A combinação de absenteísmo acima de 8% com favorabilidade de clima abaixo de 70% acende alerta para esgotamento. Recomenda-se revisão de escala e acolhimento imediato.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "root_cause",
        severity: "medium",
        departmentName: "Financeiro",
        title: "Turnover recente relacionado a picos de fechamento",
        description:
          "O desligamento voluntário no Financeiro coincidiu com o ciclo de fechamento trimestral. A pressão por prazos aparece como fator recorrente nos relatos.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "root_cause",
        severity: "low",
        departmentName: "Tecnologia",
        title: "Recuperação de clima após mitigação de sobrecarga",
        description:
          "Tecnologia apresenta melhora consistente de clima e absenteísmo estável, sugerindo que as ações de limitação de horas extras surtiram efeito.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "action_suggestion",
        severity: "high",
        departmentName: "Operações",
        title: "Revisar escala e criar pausas protegidas no turno",
        description:
          "Ajustar a distribuição de turnos para reduzir jornadas consecutivas e implementar pausas protegidas de recuperação. Medir absenteísmo e clima no próximo ciclo.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "action_suggestion",
        severity: "medium",
        departmentName: "Comercial",
        title: "Preparar equipe para o pico de metas do fim do ano",
        description:
          "Antecipar conversas sobre metas e oferecer suporte de gestão de estresse antes do período de maior pressão comercial.",
        createdAt: addDays(NOW, -4),
      },
    ],
  })

  await prisma.workforceInsight.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "burnout_risk",
        severity: "high",
        departmentName: "Atendimento",
        title: "Sinais de esgotamento no Atendimento",
        description:
          "Absenteísmo e turnover acima da média combinados com favorabilidade baixa. O volume de chamados cresceu sem ampliação da equipe.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "burnout_risk",
        severity: "medium",
        departmentName: "Logística",
        title: "Risco moderado de esgotamento na Logística",
        description:
          "Jornadas longas e pausas insuficientes aparecem nos relatos. Acompanhar absenteísmo nas próximas competências.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "root_cause",
        severity: "medium",
        departmentName: "Atendimento",
        title: "Volume de chamados associado à queda de clima",
        description:
          "A elevação do volume de atendimentos coincide com a piora de favorabilidade e o aumento de faltas não justificadas.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "action_suggestion",
        severity: "high",
        departmentName: "Atendimento",
        title: "Ampliar equipe e criar rodízio de pausas no Atendimento",
        description:
          "Dimensionar a equipe para o volume atual e implantar rodízio de pausas protegidas. Medir adesão e clima no próximo ciclo.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "action_suggestion",
        severity: "medium",
        departmentName: "Logística",
        title: "Revisar escala e intervalo de refeição na Logística",
        description:
          "Ajustar a escala para evitar jornadas consecutivas longas e garantir intervalo mínimo de refeição.",
        createdAt: addDays(NOW, -4),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        competencia: currentCompetencia,
        kind: "root_cause",
        severity: "low",
        departmentName: "Jurídico",
        title: "Clima estável com oportunidade de desenvolvimento",
        description:
          "Setor com clima acima da meta e absenteísmo baixo. Oportunidade de investir em trilhas de desenvolvimento para retenção.",
        createdAt: addDays(NOW, -4),
      },
    ],
  })

  await prisma.dataImportBatch.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        fileName: "afd-ponto-corrompido.csv",
        fileUrl: `workforce/${context.tenantId}/afd-corrompido.csv`,
        fileType: "afd",
        competencia: currentCompetencia,
        status: "failed",
        aiProvider: "gemini",
        totalRecords: 0,
        correctedRecords: 0,
        errorRecords: 1,
        errorMessage: "Não foi possível identificar a estrutura do arquivo.",
        createdById: context.adminUserId,
        createdAt: addDays(NOW, -2),
      },
      {
        id: randomUUID(),
        tenantId: context.tenantId,
        fileName: `espelho-ponto-${competenciaOf(NOW)}.csv`,
        fileUrl: `workforce/${context.tenantId}/processando.csv`,
        fileType: "espelho",
        competencia: competenciaOf(NOW),
        status: "processing",
        aiProvider: "gemini",
        totalRecords: 0,
        correctedRecords: 0,
        errorRecords: 0,
        createdById: context.rhUserId,
        createdAt: addHours(NOW, -2),
      },
    ],
  })

  logger.success(`Workforce: ${competencias.length} competências, insights de ${currentCompetencia}.`)
}

async function seedOperationalLogs(context: SeedContext): Promise<void> {
  logger.info("Gerando logs operacionais (mensagens, jobs e requests)...")

  const recentDispatchIds = context.healthDispatchIds.slice(-10)
  const messageRows: Prisma.MessageLogCreateManyInput[] = []
  for (const dispatchId of recentDispatchIds) {
    for (const employee of context.employees.slice(0, 120)) {
      const sentAt = addDays(NOW, -rand(1, 20))
      const status = random() < 0.05 ? "failed" : random() < 0.25 ? "read" : random() < 0.55 ? "delivered" : "sent"
      messageRows.push({
        id: randomUUID(),
        tenantId: context.tenantId,
        employeeId: employee.id,
        dispatchId,
        type: random() < 0.8 ? "health_survey_dispatch" : "health_survey_reminder",
        provider: "console",
        externalId: `msg_${randomUUID().slice(0, 12)}`,
        surveyLink: `${env.NEXT_PUBLIC_APP_URL}/health-survey/${MAIN_SLUG}/${nextShortCode()}`,
        status,
        errorMessage: status === "failed" ? "Número inválido ou indisponível no provedor." : null,
        queueJobId: `msg-job-${randomUUID().slice(0, 8)}`,
        sentAt,
        deliveredAt: status === "delivered" || status === "read" ? addHours(sentAt, 1) : null,
        readAt: status === "read" ? addHours(sentAt, 2) : null,
        failedAt: status === "failed" ? addHours(sentAt, 1) : null,
        updatedAt: sentAt,
      })
    }
  }
  await prisma.messageLog.createMany({ data: messageRows })

  const jobNames = [
    "health-survey-dispatcher",
    "health-survey-adherence-checker",
    "health-survey-response-reminder",
    "climate-survey-dispatcher",
    "climate-survey-response-reminder",
    "action-plan-suggestion-generator",
    "data-ingestion-processor",
    "pgr-review-reminder",
    "stripe-webhook-retry",
    "health-survey-response-token-cleanup",
    "employee-unpause",
    "organization-deletion-executor",
  ]
  const jobRows: Prisma.JobLogCreateManyInput[] = []
  for (let index = 0; index < 400; index += 1) {
    const startedAt = addHours(NOW, -index * 3 - rand(0, 2))
    const failed = random() < 0.08
    const jobName = pick(jobNames)
    jobRows.push({
      id: randomUUID(),
      jobId: `job_${randomUUID().slice(0, 12)}`,
      jobName,
      queueName: jobName.includes("message") ? "pulse-messages" : jobName.includes("email") ? "pulse-emails" : "pulse-jobs",
      status: failed ? "failed" : "completed",
      attemptNumber: failed ? rand(1, 3) : 1,
      maxAttempts: 3,
      payload: { tenantId: context.tenantId, source: "scheduler" },
      result: failed ? Prisma.JsonNull : { processed: rand(1, 46), skipped: rand(0, 8) },
      errorMessage: failed ? "Timeout ao consultar o provedor externo." : null,
      errorStack: failed ? "Error: timeout\n    at provider.request (adapter.ts:120:11)" : null,
      queuedAt: addHours(startedAt, -0.01),
      startedAt,
      finishedAt: addHours(startedAt, 0.02),
      durationMs: rand(320, 9800),
      createdAt: startedAt,
    })
  }
  await prisma.jobLog.createMany({ data: jobRows })

  const tenantPaths = [
    "/dashboard",
    "/governance",
    "/employees",
    "/employees/import",
    "/departments",
    "/health-surveys",
    "/climate-surveys",
    "/climate-surveys/adherence",
    "/climate-surveys/reports",
    "/climate-surveys/compare",
    "/climate-surveys/action-plans",
    "/workforce",
    "/workforce/import",
    "/workforce/insights",
    "/action-plans",
    "/alerts",
    "/documents",
    "/pgr",
    "/reports",
    "/settings",
    "/billing",
  ]
  const superAdminPaths = [
    "/super-admin/dashboard",
    "/super-admin/organizations",
    "/super-admin/plans",
    "/super-admin/jobs",
    "/super-admin/logs",
    "/super-admin/terms",
    "/super-admin/admins",
  ]
  const publicPaths = ["/login", "/report/meridiano", "/health-survey/meridiano/9409185", "/climate-survey/meridiano/3588772", "/api/health"]
  const requestRows: Prisma.RequestLogCreateManyInput[] = []
  for (let index = 0; index < 2200; index += 1) {
    const createdAt = addHours(NOW, -index * 0.35 - random() * 0.3)
    const surfaceRoll = random()
    const surface = surfaceRoll < 0.75 ? "tenant" : surfaceRoll < 0.87 ? "super_admin" : "public"
    const path = surface === "tenant" ? pick(tenantPaths) : surface === "super_admin" ? pick(superAdminPaths) : pick(publicPaths)
    const methodRoll = random()
    const method = methodRoll < 0.84 ? "GET" : methodRoll < 0.93 ? "POST" : methodRoll < 0.97 ? "PUT" : "DELETE"
    const statusRoll = random()
    const status = statusRoll < 0.9 ? 200 : statusRoll < 0.95 ? 302 : statusRoll < 0.98 ? 404 : 500
    const isSuperAdmin = surface === "super_admin"
    const isPublic = surface === "public"
    requestRows.push({
      id: randomUUID(),
      method,
      path,
      query: path.includes("?") ? null : random() < 0.18 ? `page=${rand(1, 5)}` : null,
      ip: `191.10.${rand(1, 254)}.${rand(1, 254)}`,
      userAgent: pick([
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      ]),
      requestHeaders: { accept: "text/html", "user-agent": "Mozilla/5.0" },
      responseStatus: status,
      durationMs: rand(25, status === 500 ? 4200 : 1600),
      tenantId: isPublic || isSuperAdmin ? null : context.tenantId,
      userId: isPublic ? null : isSuperAdmin ? null : random() < 0.5 ? context.adminUserId : context.rhUserId,
      userType: isPublic ? null : isSuperAdmin ? "super_admin" : "org_user",
      isRedirect: status === 302,
      redirectTo: status === 302 ? (isSuperAdmin ? "/super-admin/login" : "/login") : null,
      errorMessage: status === 500 ? "Erro inesperado ao carregar a página." : null,
      createdAt,
    })
  }
  await prisma.requestLog.createMany({ data: requestRows })

  const auditRows: Prisma.AuditLogCreateManyInput[] = []
  const actions = [
    { action: "employee.created", resource: "employee" },
    { action: "employee.updated", resource: "employee" },
    { action: "department.created", resource: "department" },
    { action: "document.uploaded", resource: "document" },
    { action: "action_plan.created", resource: "action_plan" },
    { action: "action_plan.completed", resource: "action_plan" },
    { action: "report.resolved", resource: "anonymous_report" },
    { action: "pgr.generated", resource: "pgr_review" },
    { action: "health_survey.config_created", resource: "health_survey_config" },
    { action: "climate_survey.dispatched", resource: "climate_survey_dispatch" },
    { action: "settings.updated", resource: "organization" },
    { action: "billing.portal_opened", resource: "billing" },
  ]
  for (let index = 0; index < 300; index += 1) {
    const entry = pick(actions)
    auditRows.push({
      id: randomUUID(),
      tenantId: context.tenantId,
      userId: random() < 0.6 ? context.adminUserId : context.rhUserId,
      action: entry.action,
      resource: entry.resource,
      resourceId: randomUUID(),
      metadata: { origin: "web", ip: `191.10.20.${rand(10, 60)}` },
      createdAt: addDays(NOW, -rand(0, 120)),
    })
  }
  await prisma.auditLog.createMany({ data: auditRows })

  logger.success(
    `Logs: ${messageRows.length} mensagens, ${jobRows.length} jobs, ${requestRows.length} requests, ${auditRows.length} auditorias.`,
  )
}

interface SecondaryOrgInput {
  name: string
  slug: string
  cnpj: string
  planName: "Starter" | "Professional" | "Enterprise"
  status: "trialing" | "past_due" | "pending" | "suspended" | "cancelled" | "active"
  departmentNames: string[]
  employeeCount: number
  adminEmail: string
  trialExpiresAt: Date | null
}

async function seedSecondaryOrganizations(
  plans: Map<string, { id: string; priceInCents: number }>,
  consentVersionId: string,
  termsVersionId: string,
): Promise<void> {
  const definitions: SecondaryOrgInput[] = [
    {
      name: "Aurora Labs",
      slug: "aurora-labs",
      cnpj: "98.765.432/0001-10",
      planName: "Starter",
      status: "trialing",
      departmentNames: ["Produto", "Engenharia", "Customer Success"],
      employeeCount: 12,
      adminEmail: "admin@auroralabs.com.br",
      trialExpiresAt: addDays(NOW, 21),
    },
    {
      name: "Vertex Indústria",
      slug: "vertex",
      cnpj: "45.678.912/0001-34",
      planName: "Enterprise",
      status: "past_due",
      departmentNames: ["Produção", "Manutenção", "Qualidade", "Logística"],
      employeeCount: 18,
      adminEmail: "admin@vertex.ind.br",
      trialExpiresAt: null,
    },
    {
      name: "Nexo Saúde",
      slug: "nexo-saude",
      cnpj: "33.444.555/0001-66",
      planName: "Professional",
      status: "pending",
      departmentNames: ["Clínica", "Administrativo", "Enfermagem"],
      employeeCount: 15,
      adminEmail: "admin@nexosaude.com.br",
      trialExpiresAt: null,
    },
    {
      name: "Lumen Tech",
      slug: "lumen-tech",
      cnpj: "22.333.444/0001-55",
      planName: "Enterprise",
      status: "suspended",
      departmentNames: ["Engenharia", "Produto", "Dados", "Suporte"],
      employeeCount: 25,
      adminEmail: "admin@lumentech.com.br",
      trialExpiresAt: null,
    },
    {
      name: "Horizonte Varejo",
      slug: "horizonte-varejo",
      cnpj: "11.222.333/0001-44",
      planName: "Starter",
      status: "cancelled",
      departmentNames: ["Loja Centro", "Logística"],
      employeeCount: 9,
      adminEmail: "admin@horizontevarejo.com.br",
      trialExpiresAt: null,
    },
    {
      name: "Atlas Serviços",
      slug: "atlas-servicos",
      cnpj: "55.666.777/0001-88",
      planName: "Professional",
      status: "active",
      departmentNames: ["Facilities", "Manutenção", "Administrativo", "Operações"],
      employeeCount: 22,
      adminEmail: "admin@atlasservicos.com.br",
      trialExpiresAt: null,
    },
  ]

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  for (let definitionIndex = 0; definitionIndex < definitions.length; definitionIndex += 1) {
    const definition = definitions[definitionIndex]
    if (!definition) continue
    const plan = plans.get(definition.planName)
    if (!plan) continue

    const org = await prisma.organization.create({
      data: {
        id: randomUUID(),
        slug: definition.slug,
        name: definition.name,
        cnpj: definition.cnpj,
        planId: plan.id,
        timezone: TIMEZONE,
        billingStatus: definition.status,
        trialExpiresAt: definition.trialExpiresAt,
        isActive: definition.status !== "cancelled",
        createdAt: subMonths(NOW, 18 - definitionIndex * 2),
      },
    })

    const admin = await prisma.organizationUser.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        email: definition.adminEmail,
        passwordHash,
        name: `Admin ${definition.name}`,
        role: "admin",
        isActive: true,
        emailVerifiedAt: subMonths(NOW, 8),
      },
    })
    await prisma.platformTermsAcceptance.create({
      data: {
        id: randomUUID(),
        termsVersionId,
        userId: admin.id,
        acceptedAt: subMonths(NOW, 8),
        ipAddress: "191.10.30.40",
        userAgent: "seed/demo",
      },
    })

    const subscription = await prisma.organizationSubscription.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        planId: plan.id,
        externalSubscriptionId: `sub_${definition.slug}_${org.id.slice(0, 8)}`,
        status: definition.status,
        currentPeriodStart: startOfMonth(NOW),
        currentPeriodEnd: addMonths(startOfMonth(NOW), 1),
        cancelAtPeriodEnd: definition.status === "past_due" || definition.status === "cancelled",
        snapshotPlanName: definition.planName,
        snapshotMaxEmployees: definition.planName === "Starter" ? 50 : definition.planName === "Professional" ? 150 : 300,
        snapshotPriceInCents: plan.priceInCents,
        snapshotInterval: "month",
        snapshotExternalPriceId:
          definition.planName === "Starter"
            ? "price_starter_monthly"
            : definition.planName === "Professional"
              ? "price_professional_monthly"
              : "price_enterprise_monthly",
      },
    })

    const secondaryFeatures =
      definition.planName === "Starter"
        ? (["anonymous_reports", "messaging"] as const)
        : (["action_plans", "documents", "anonymous_reports", "pgr", "messaging", "climate_surveys"] as const)
    await prisma.subscriptionFeature.createMany({
      data: secondaryFeatures.map((feature) => ({ subscriptionId: subscription.id, feature })),
    })

    await prisma.organizationInvitation.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        email: `rh@${definition.slug}.com.br`,
        role: "rh",
        token: randomUUID(),
        expiresAt: addDays(NOW, 7),
        usedAt: null,
        createdAt: addDays(NOW, -2),
      },
    })

    const secondaryWebhookRows: Prisma.BillingWebhookEventCreateManyInput[] = []
    for (let webhookIndex = 0; webhookIndex < 4; webhookIndex += 1) {
      secondaryWebhookRows.push({
        id: randomUUID(),
        tenantId: org.id,
        externalEventId: `evt_${definition.slug}_${webhookIndex}_${randomUUID().slice(0, 8)}`,
        type: webhookIndex % 2 === 0 ? "invoice.payment_succeeded" : "customer.subscription.updated",
        processedAt: addDays(NOW, -webhookIndex * 7 - 1),
        error: null,
        payload: { id: `evt_${definition.slug}_${webhookIndex}`, type: "invoice.payment_succeeded" },
        createdAt: addDays(NOW, -webhookIndex * 7 - 1),
      })
    }
    await prisma.billingWebhookEvent.createMany({ data: secondaryWebhookRows })

    const deptIds: string[] = []
    for (const departmentName of definition.departmentNames) {
      const department = await prisma.department.create({
        data: {
          id: randomUUID(),
          tenantId: org.id,
          name: departmentName,
          isActive: true,
          workStartTime: "08:00",
          workEndTime: "17:00",
          createdAt: subMonths(NOW, 8),
        },
      })
      deptIds.push(department.id)
      await prisma.departmentWorkDay.createMany({
        data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ departmentId: department.id, dayOfWeek })),
      })
    }

    const employees: { id: string; departmentId: string }[] = []
    for (let index = 0; index < definition.employeeCount; index += 1) {
      const departmentId = deptIds[index % deptIds.length]
      if (!departmentId) continue
      const employee = await prisma.employee.create({
        data: {
          id: randomUUID(),
          tenantId: org.id,
          departmentId,
          name: `Colaborador ${definition.name} ${index + 1}`,
          phone: `+55119${String(80000000 + index).padStart(8, "0")}`,
          email: `colaborador${index + 1}@${definition.slug}.com.br`,
          status: "active",
          createdAt: subMonths(NOW, 8),
        },
      })
      employees.push({ id: employee.id, departmentId })
      await prisma.employeeConsent.create({
        data: {
          id: randomUUID(),
          tenantId: org.id,
          employeeId: employee.id,
          consentTermVersionId: consentVersionId,
          event: "accepted",
          source: "message_link",
          documentHash: hash(employee.id),
          createdAt: subMonths(NOW, 8),
        },
      })
    }

    const config = await prisma.healthSurveyConfiguration.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        name: "Pesquisa de Saúde Ocupacional",
        frequency: "weekly",
        dispatchTime: "09:00",
        tokenExpiryHours: 48,
        isActive: true,
        createdAt: subMonths(NOW, 6),
      },
    })
    for (const departmentId of deptIds) {
      await prisma.healthSurveyConfigDepartment.create({ data: { configId: config.id, departmentId } })
    }
    await prisma.healthSurveyConfigWorkDay.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ configId: config.id, dayOfWeek })),
    })
    const questionIds: string[] = []
    for (let index = 0; index < DEFAULT_QUESTIONS.length; index += 1) {
      const question = DEFAULT_QUESTIONS[index]
      if (!question) continue
      const created = await prisma.healthSurveyQuestion.create({
        data: {
          id: randomUUID(),
          tenantId: org.id,
          healthSurveyConfigurationId: config.id,
          text: question.text,
          order: index + 1,
          scoreDirection: question.direction,
          isActive: true,
        },
      })
      questionIds.push(created.id)
    }

    for (let week = 0; week < 6; week += 1) {
      const dispatchDate = setMinutes(setHours(subWeeks(NOW, 5 - week), 9), 0)
      const dispatchId = randomUUID()
      await prisma.healthSurveyDispatch.create({
        data: {
          id: dispatchId,
          tenantId: org.id,
          healthSurveyConfigurationId: config.id,
          scheduledAt: dispatchDate,
          dispatchedAt: dispatchDate,
          adherenceCheckedAt: addDays(dispatchDate, 2),
          status: "available",
          source: "auto",
          signedLinkToken: randomUUID(),
          createdAt: dispatchDate,
        },
      })
      for (const departmentId of deptIds) {
        const departmentEmployees = employees.filter((employee) => employee.departmentId === departmentId)
        const respondents = departmentEmployees.slice(0, Math.max(1, Math.round(departmentEmployees.length * 0.7)))
        await prisma.healthSurveyDeptDispatch.create({
          data: {
            dispatchId,
            departmentId,
            totalRecipients: departmentEmployees.length,
            totalResponses: respondents.length,
          },
        })
        for (const employee of departmentEmployees) {
          const used = respondents.some((respondent) => respondent.id === employee.id)
          const usedAt = used ? addHours(dispatchDate, rand(1, 6)) : null
          await prisma.healthSurveyResponseToken.create({
            data: {
              id: randomUUID(),
              tenantId: org.id,
              dispatchId,
              employeeId: employee.id,
              token: randomUUID(),
              shortCode: nextShortCode(),
              expiresAt: addDays(dispatchDate, 2),
              workStartTime: "08:00",
              workEndTime: "17:00",
              usedAt,
              createdAt: dispatchDate,
            },
          })
          if (!used || usedAt === null) continue
          const responseId = randomUUID()
          const base = definition.status === "past_due" ? 2.8 : 3.9
          await prisma.healthSurveyResponse.create({
            data: { id: responseId, tenantId: org.id, dispatchId, departmentId, createdAt: usedAt },
          })
          for (const questionId of questionIds) {
            await prisma.healthSurveyResponseItem.create({
              data: {
                id: randomUUID(),
                healthSurveyResponseId: responseId,
                questionId,
                score: clamp(Math.round(base + (random() - 0.5) * 1.4)),
              },
            })
          }
        }
      }
    }

    await prisma.alert.create({
      data: {
        id: randomUUID(),
        tenantId: org.id,
        departmentId: deptIds[0] ?? null,
        type: definition.status === "past_due" ? "low_score" : "low_adherence",
        severity: definition.status === "past_due" ? "critical" : "warning",
        message:
          definition.status === "past_due"
            ? "Índice de saúde abaixo do esperado no setor principal."
            : "Adesão abaixo do esperado na última semana.",
        isRead: false,
        createdAt: addDays(NOW, -2),
      },
    })

    logger.success(`Organização secundária criada: ${definition.name} (${definition.status}).`)
  }
}

async function seedPlatformExtras(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const extraAdmins = [
    { email: "operacoes@pulseips.com.br", name: "Operações Pulse" },
    { email: "financeiro@pulseips.com.br", name: "Financeiro Pulse" },
    { email: "suporte@pulseips.com.br", name: "Suporte Pulse" },
  ]
  for (const admin of extraAdmins) {
    await prisma.superAdmin.upsert({
      where: { email: admin.email },
      update: { name: admin.name, passwordHash },
      create: { id: randomUUID(), email: admin.email, passwordHash, name: admin.name },
    })
  }

  await prisma.platformTermsVersion.upsert({
    where: { version: "0.9.0" },
    update: { isActive: false },
    create: {
      id: randomUUID(),
      version: "0.9.0",
      title: "Termos de Uso — Pulse IPS (versão anterior)",
      content: "<h1>Termos de Uso — versão 0.9.0</h1><p>Versão histórica mantida para auditoria.</p>",
      isActive: false,
      effectiveAt: subMonths(NOW, 18),
      createdAt: subMonths(NOW, 18),
    },
  })

  await prisma.privacyPolicyVersion.upsert({
    where: { version: "0.9.0" },
    update: { isActive: false },
    create: {
      id: randomUUID(),
      version: "0.9.0",
      title: "Política de Privacidade — versão anterior",
      content: "<h1>Política de Privacidade — versão 0.9.0</h1><p>Versão histórica mantida para auditoria.</p>",
      isActive: false,
      effectiveAt: subMonths(NOW, 18),
      createdAt: subMonths(NOW, 18),
    },
  })

  await prisma.consentTermVersion.upsert({
    where: { version: "0.9.0" },
    update: { isActive: false },
    create: {
      id: randomUUID(),
      version: "0.9.0",
      content: "<h1>TCLE — versão 0.9.0</h1><p>Versão histórica mantida para auditoria.</p>",
      contentHash: hash("consent-0.9.0"),
      isActive: false,
      createdAt: subMonths(NOW, 18),
    },
  })

  logger.success(`Super admins extras e versões legais históricas garantidos.`)
}

async function diversifyEmployeeStatuses(context: SeedContext): Promise<void> {
  const candidates = context.employees.slice(0, 12)
  const inactive = candidates.slice(0, 4)
  const paused = candidates.slice(4, 7)
  for (const employee of inactive) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { status: "inactive" },
    })
  }
  for (const employee of paused) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        status: "paused",
        pauseStartAt: addDays(NOW, -12),
        pauseEndAt: addDays(NOW, 18),
      },
    })
  }
}

async function main(): Promise<void> {
  logger.info("Iniciando seed de demonstração completo...")
  logger.info(`Data de referência: ${format(NOW, "dd/MM/yyyy HH:mm")}`)

  const consentVersion = await prisma.consentTermVersion.findFirst({ where: { isActive: true } })
  if (!consentVersion) throw new Error("Nenhuma versão de TCLE ativa. Execute yarn seed primeiro.")
  const termsVersion = await prisma.platformTermsVersion.findFirst({ where: { isActive: true } })
  if (!termsVersion) throw new Error("Nenhuma versão de Termos da Plataforma ativa. Execute yarn seed primeiro.")

  const professionalPrice = await prisma.planPrice.findFirst({
    where: { externalPriceId: "price_professional_monthly", isActive: true },
    include: { plan: true },
  })
  if (!professionalPrice) throw new Error("Plano Professional não encontrado. Execute yarn seed primeiro.")
  const starterPrice = await prisma.planPrice.findFirst({
    where: { externalPriceId: "price_starter_monthly", isActive: true },
    include: { plan: true },
  })
  const enterprisePrice = await prisma.planPrice.findFirst({
    where: { externalPriceId: "price_enterprise_monthly", isActive: true },
    include: { plan: true },
  })
  if (!starterPrice || !enterprisePrice) throw new Error("Planos Starter/Enterprise não encontrados. Execute yarn seed primeiro.")

  await wipeDemoData()
  await seedPlatformExtras()

  const context = await seedMainOrganization(
    { id: professionalPrice.planId, priceInCents: professionalPrice.priceInCents },
    consentVersion.id,
    termsVersion.id,
  )
  logger.success(`Organização principal criada: ${MAIN_NAME} (${context.tenantId})`)

  await seedHealthSurveyHistory(context)
  await diversifyEmployeeStatuses(context)
  const waves = await seedClimateSurveys(context)
  await seedClimateActionPlans(context, waves)
  await seedActionPlansAndSuggestions(context)
  await seedPgr(context)
  await seedWorkforce(context)
  await seedOperationalLogs(context)

  const plans = new Map<string, { id: string; priceInCents: number }>([
    ["Starter", { id: starterPrice.planId, priceInCents: starterPrice.priceInCents }],
    ["Professional", { id: professionalPrice.planId, priceInCents: professionalPrice.priceInCents }],
    ["Enterprise", { id: enterprisePrice.planId, priceInCents: enterprisePrice.priceInCents }],
  ])
  await seedSecondaryOrganizations(plans, consentVersion.id, termsVersion.id)

  const counts = await Promise.all([
    prisma.organization.count(),
    prisma.employee.count(),
    prisma.healthSurveyResponse.count(),
    prisma.climateSurveyResponse.count(),
    prisma.employeeMonthly.count(),
    prisma.actionPlan.count(),
    prisma.alert.count(),
    prisma.messageLog.count(),
    prisma.emailLog.count(),
    prisma.jobLog.count(),
    prisma.requestLog.count(),
  ])

  logger.success("")
  logger.success("Seed de demonstração concluído.")
  logger.info("")
  logger.info("  ─── Acesso à organização principal ───")
  logger.info(`  Organização: ${MAIN_NAME} (slug: ${MAIN_SLUG})`)
  logger.info(`  Admin:       ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`)
  logger.info(`  RH:          ${RH_EMAIL} / ${DEMO_PASSWORD}`)
  logger.info("")
  logger.info("  ─── Super Admin ───")
  logger.info("  URL:         /super-admin/login")
  logger.info("  Email:       admin@admin.com")
  logger.info("  Senha:       Testando123!")
  logger.info("")
  logger.info("  ─── Outras organizações ───")
  logger.info(`  Aurora Labs (trial)        → admin@auroralabs.com.br / ${DEMO_PASSWORD}`)
  logger.info(`  Vertex Indústria (past_due)→ admin@vertex.ind.br / ${DEMO_PASSWORD}`)
  logger.info(`  Nexo Saúde (pending)       → admin@nexosaude.com.br / ${DEMO_PASSWORD}`)
  logger.info(`  Lumen Tech (suspended)     → admin@lumentech.com.br / ${DEMO_PASSWORD}`)
  logger.info(`  Horizonte Varejo (cancelled)→ admin@horizontevarejo.com.br / ${DEMO_PASSWORD}`)
  logger.info(`  Atlas Serviços (active)    → admin@atlasservicos.com.br / ${DEMO_PASSWORD}`)
  logger.info("")
  logger.info(`  Organizações: ${counts[0]} · Colaboradores: ${counts[1]}`)
  logger.info(`  Respostas saúde: ${counts[2]} · Respostas clima: ${counts[3]} · Linhas workforce: ${counts[4]}`)
  logger.info(`  Planos de ação: ${counts[5]} · Alertas: ${counts[6]}`)
  logger.info(`  Mensagens: ${counts[7]} · E-mails: ${counts[8]} · Jobs: ${counts[9]} · Requests: ${counts[10]}`)
}

main()
  .catch((error: unknown) => {
    logger.error("Falha no seed de demonstração", error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
