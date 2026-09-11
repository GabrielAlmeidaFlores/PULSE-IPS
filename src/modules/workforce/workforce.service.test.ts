import { describe, it, expect, vi, beforeEach } from "vitest"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import { findWorkforceMonthlyRecords } from "@/modules/workforce/workforce.repository"
import type { WorkforceMonthlyRecord } from "@/modules/workforce/workforce.types"

vi.mock("@/modules/workforce/workforce.repository")

const TENANT_ID = "tenant-1"

function record(overrides: Partial<WorkforceMonthlyRecord>): WorkforceMonthlyRecord {
  return {
    competencia: "2026-08",
    employeeName: "Colaborador",
    document: null,
    registration: null,
    departmentName: null,
    admissionDate: null,
    terminationDate: null,
    expectedHours: 176,
    justifiedAbsenceHours: 0,
    unjustifiedAbsenceHours: 0,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  }
}

const mockFindRecords = vi.mocked(findWorkforceMonthlyRecords)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getWorkforceDashboard — sem dados", () => {
  it("retorna dashboard vazio quando não há registros", async () => {
    mockFindRecords.mockResolvedValue([])

    const dashboard = await getWorkforceDashboard(TENANT_ID)

    expect(dashboard.competencias).toEqual([])
    expect(dashboard.selectedCompetencia).toBeNull()
    expect(dashboard.kpis.headcount).toBe(0)
    expect(dashboard.departments).toEqual([])
    expect(dashboard.evolution).toEqual([])
  })
})

describe("getWorkforceDashboard — KPIs", () => {
  beforeEach(() => {
    mockFindRecords.mockResolvedValue([
      record({ competencia: "2026-07", employeeName: "Ana", departmentName: "TI" }),
      record({ competencia: "2026-08", employeeName: "Ana", departmentName: "TI", justifiedAbsenceHours: 8 }),
      record({
        competencia: "2026-08",
        employeeName: "Bruno",
        departmentName: "TI",
        admissionDate: new Date("2026-08-10T00:00:00.000Z"),
      }),
      record({
        competencia: "2026-08",
        employeeName: "Carla",
        departmentName: null,
        terminationDate: new Date("2026-08-20T00:00:00.000Z"),
        unjustifiedAbsenceHours: 36,
      }),
      record({
        competencia: "2026-08",
        employeeName: "Diego",
        departmentName: "Financeiro",
        terminationDate: new Date("2026-06-30T00:00:00.000Z"),
      }),
    ])
  })

  it("seleciona a competência mais recente por padrão", async () => {
    const dashboard = await getWorkforceDashboard(TENANT_ID)

    expect(dashboard.competencias).toEqual(["2026-08", "2026-07"])
    expect(dashboard.selectedCompetencia).toBe("2026-08")
  })

  it("calcula headcount, admissões, desligamentos, turnover e absenteísmo", async () => {
    const dashboard = await getWorkforceDashboard(TENANT_ID, "2026-08")

    expect(dashboard.kpis.headcount).toBe(3)
    expect(dashboard.kpis.admissions).toBe(1)
    expect(dashboard.kpis.terminations).toBe(1)
    expect(dashboard.kpis.turnoverPercent).toBe(33.3)
    expect(dashboard.kpis.expectedHours).toBe(528)
    expect(dashboard.kpis.absentHours).toBe(44)
    expect(dashboard.kpis.absenteeismPercent).toBe(8.3)
  })

  it("omite setores sem headcount, admissões ou desligamentos na competência", async () => {
    const dashboard = await getWorkforceDashboard(TENANT_ID, "2026-08")

    expect(dashboard.departments.some((row) => row.departmentName === "Financeiro")).toBe(false)
  })

  it("agrupa por setor incluindo 'Sem setor'", async () => {
    const dashboard = await getWorkforceDashboard(TENANT_ID, "2026-08")

    expect(dashboard.departments.map((row) => row.departmentName)).toEqual(["TI", "Sem setor"])
    expect(dashboard.departments[0]).toMatchObject({ headcount: 2, admissions: 1, terminations: 0 })
    expect(dashboard.departments[1]).toMatchObject({ headcount: 1, terminations: 1, turnoverPercent: 100 })
  })

  it("monta a evolução entre competências em ordem cronológica", async () => {
    const dashboard = await getWorkforceDashboard(TENANT_ID)

    expect(dashboard.evolution.map((point) => point.competencia)).toEqual(["2026-07", "2026-08"])
    expect(dashboard.evolution[0]?.headcount).toBe(1)
    expect(dashboard.evolution[1]?.headcount).toBe(3)
  })

  it("cai para a competência mais recente quando a informada não existe", async () => {
    const dashboard = await getWorkforceDashboard(TENANT_ID, "2020-01")

    expect(dashboard.selectedCompetencia).toBe("2026-08")
  })
})

describe("getWorkforceDashboard — casos-limite", () => {
  it("zera turnover e absenteísmo quando não há headcount ativo", async () => {
    mockFindRecords.mockResolvedValue([
      record({
        competencia: "2026-08",
        terminationDate: new Date("2026-06-30T00:00:00.000Z"),
        expectedHours: 0,
      }),
    ])

    const dashboard = await getWorkforceDashboard(TENANT_ID, "2026-08")

    expect(dashboard.kpis.headcount).toBe(0)
    expect(dashboard.kpis.turnoverPercent).toBeNull()
    expect(dashboard.kpis.absenteeismPercent).toBeNull()
  })

  it("trata competência em formato inválido sem admissões/desligamentos", async () => {
    mockFindRecords.mockResolvedValue([record({ competencia: "sem-formato" })])

    const dashboard = await getWorkforceDashboard(TENANT_ID)

    expect(dashboard.selectedCompetencia).toBe("sem-formato")
    expect(dashboard.kpis.headcount).toBe(1)
    expect(dashboard.kpis.admissions).toBe(0)
    expect(dashboard.kpis.terminations).toBe(0)
    expect(dashboard.kpis.turnoverPercent).toBe(0)
  })
})

describe("getWorkforceDashboard — deduplicação", () => {
  it("mantém apenas o registro mais recente do colaborador na mesma competência", async () => {
    mockFindRecords.mockResolvedValue([
      record({
        competencia: "2026-08",
        employeeName: "Ana",
        registration: "R1",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
      record({
        competencia: "2026-08",
        employeeName: "Ana",
        registration: "R1",
        justifiedAbsenceHours: 8,
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
      }),
    ])

    const dashboard = await getWorkforceDashboard(TENANT_ID, "2026-08")

    expect(dashboard.kpis.headcount).toBe(1)
    expect(dashboard.kpis.absentHours).toBe(8)
  })
})
