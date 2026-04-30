export interface Employee {
  id: string
  tenantId: string
  departmentId: string
  name: string
  phone: string
  email: string | null
  document: string | null
  status: "active" | "inactive" | "paused"
  workStartTime: string | null
  workEndTime: string | null
  workDays: number[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateEmployeeInput {
  departmentId: string
  name: string
  phone: string
  email?: string | undefined
  document?: string | undefined
  workStartTime?: string | undefined
  workEndTime?: string | undefined
  workDays?: number[] | undefined
}

export interface UpdateEmployeeInput {
  departmentId?: string | undefined
  name?: string | undefined
  phone?: string | undefined
  email?: string | null | undefined
  document?: string | null | undefined
  status?: "active" | "inactive" | "paused" | undefined
  workStartTime?: string | null | undefined
  workEndTime?: string | null | undefined
  workDays?: number[] | null | undefined
}

export interface ImportRow {
  name: string
  phone: string
  departmentName: string
  email?: string | undefined
}

export interface ImportPreviewItem {
  row: number
  name: string
  phone: string
  departmentName: string
  email?: string | undefined
  valid: boolean
  errors: string[]
}

export interface ImportPreview {
  valid: number
  invalid: number
  items: ImportPreviewItem[]
}

export interface ImportResult {
  created: number
  failed: number
  errors: { row: number; error: string }[]
}
