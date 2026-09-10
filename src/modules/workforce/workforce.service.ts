import { findWorkforceMonthlyRecords } from "@/modules/workforce/workforce.repository"
import type {
  WorkforceDashboard,
  WorkforceDepartmentRow,
  WorkforceEvolutionPoint,
  WorkforceKpis,
  WorkforceMonthlyRecord,
} from "@/modules/workforce/workforce.types"

const UNASSIGNED_DEPARTMENT = "Sem setor"

interface MonthRange {
  start: Date
  end: Date
}

function toMonthRange(competencia: string): MonthRange | null {
  const match = /^(\d{4})-(\d{2})$/.exec(competencia)
  if (match === null) return null
  const yearPart = match[1]
  const monthPart = match[2]
  if (yearPart === undefined || monthPart === undefined) return null
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (month < 1 || month > 12) return null
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  }
}

function isWithinRange(date: Date | null, range: MonthRange): boolean {
  if (date === null) return false
  return date >= range.start && date <= range.end
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function resolveDepartmentName(departmentName: string | null): string {
  return departmentName !== null && departmentName.trim().length > 0 ? departmentName : UNASSIGNED_DEPARTMENT
}

function resolveEmployeeKey(record: WorkforceMonthlyRecord): string {
  const document = record.document?.trim()
  if (document !== undefined && document.length > 0) return `doc:${document}`
  const registration = record.registration?.trim()
  if (registration !== undefined && registration.length > 0) return `reg:${registration}`
  return `name:${record.employeeName.trim().toLowerCase()}`
}

function dedupeByEmployee(records: WorkforceMonthlyRecord[]): WorkforceMonthlyRecord[] {
  const latestByKey = new Map<string, WorkforceMonthlyRecord>()
  for (const record of records) {
    const key = `${record.competencia}|${resolveEmployeeKey(record)}`
    const existing = latestByKey.get(key)
    if (existing === undefined || record.createdAt.getTime() > existing.createdAt.getTime()) {
      latestByKey.set(key, record)
    }
  }
  return Array.from(latestByKey.values())
}

function computeKpis(records: WorkforceMonthlyRecord[], competencia: string): WorkforceKpis {
  const range = toMonthRange(competencia)
  const activeRecords =
    range === null
      ? records
      : records.filter((record) => record.terminationDate === null || record.terminationDate >= range.start)
  const headcount = activeRecords.length
  const admissions = range === null ? 0 : records.filter((record) => isWithinRange(record.admissionDate, range)).length
  const terminations = range === null ? 0 : records.filter((record) => isWithinRange(record.terminationDate, range)).length
  const expectedHours = sumValues(activeRecords.map((record) => record.expectedHours ?? 0))
  const absentHours = sumValues(
    activeRecords.map((record) => (record.justifiedAbsenceHours ?? 0) + (record.unjustifiedAbsenceHours ?? 0)),
  )

  return {
    headcount,
    admissions,
    terminations,
    turnoverPercent: headcount > 0 ? roundOneDecimal((terminations / headcount) * 100) : null,
    absenteeismPercent: expectedHours > 0 ? roundOneDecimal((absentHours / expectedHours) * 100) : null,
    expectedHours: roundOneDecimal(expectedHours),
    absentHours: roundOneDecimal(absentHours),
  }
}

function groupByCompetencia(records: WorkforceMonthlyRecord[]): Map<string, WorkforceMonthlyRecord[]> {
  const groups = new Map<string, WorkforceMonthlyRecord[]>()
  for (const record of records) {
    const group = groups.get(record.competencia)
    if (group === undefined) {
      groups.set(record.competencia, [record])
    } else {
      group.push(record)
    }
  }
  return groups
}

function buildDepartmentRows(records: WorkforceMonthlyRecord[], competencia: string): WorkforceDepartmentRow[] {
  const byDepartment = new Map<string, WorkforceMonthlyRecord[]>()
  for (const record of records) {
    const name = resolveDepartmentName(record.departmentName)
    const group = byDepartment.get(name)
    if (group === undefined) {
      byDepartment.set(name, [record])
    } else {
      group.push(record)
    }
  }

  return Array.from(byDepartment.entries())
    .map(([departmentName, departmentRecords]) => {
      const kpis = computeKpis(departmentRecords, competencia)
      return {
        departmentName,
        headcount: kpis.headcount,
        admissions: kpis.admissions,
        terminations: kpis.terminations,
        turnoverPercent: kpis.turnoverPercent,
        absenteeismPercent: kpis.absenteeismPercent,
      }
    })
    .filter((row) => row.headcount > 0 || row.admissions > 0 || row.terminations > 0)
    .sort((a, b) => b.headcount - a.headcount || a.departmentName.localeCompare(b.departmentName, "pt-BR"))
}

function buildEvolution(groups: Map<string, WorkforceMonthlyRecord[]>): WorkforceEvolutionPoint[] {
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([competencia, records]) => {
      const kpis = computeKpis(records, competencia)
      return {
        competencia,
        headcount: kpis.headcount,
        turnoverPercent: kpis.turnoverPercent,
        absenteeismPercent: kpis.absenteeismPercent,
      }
    })
}

const EMPTY_KPIS: WorkforceKpis = {
  headcount: 0,
  admissions: 0,
  terminations: 0,
  turnoverPercent: null,
  absenteeismPercent: null,
  expectedHours: 0,
  absentHours: 0,
}

export async function getWorkforceDashboard(tenantId: string, competencia?: string): Promise<WorkforceDashboard> {
  const records = dedupeByEmployee(await findWorkforceMonthlyRecords(tenantId))
  const groups = groupByCompetencia(records)
  const competencias = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))
  const selectedCompetencia =
    competencia !== undefined && groups.has(competencia) ? competencia : (competencias[0] ?? null)

  if (selectedCompetencia === null) {
    return {
      competencias: [],
      selectedCompetencia: null,
      kpis: EMPTY_KPIS,
      departments: [],
      evolution: [],
    }
  }

  return {
    competencias,
    selectedCompetencia,
    kpis: computeKpis(groups.get(selectedCompetencia) ?? [], selectedCompetencia),
    departments: buildDepartmentRows(groups.get(selectedCompetencia) ?? [], selectedCompetencia),
    evolution: buildEvolution(groups),
  }
}
