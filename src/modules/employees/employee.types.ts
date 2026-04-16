export interface Employee {
  id: string
  tenantId: string
  departmentId: string
  name: string
  phone: string
  email: string | null
  status: "active" | "inactive" | "paused"
  workStartTime: string | null
  workEndTime: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateEmployeeInput {
  departmentId: string
  name: string
  phone: string
  email?: string | undefined
  workStartTime?: string | undefined
  workEndTime?: string | undefined
}

export interface UpdateEmployeeInput {
  departmentId?: string | undefined
  name?: string | undefined
  phone?: string | undefined
  email?: string | null | undefined
  status?: "active" | "inactive" | "paused" | undefined
  workStartTime?: string | null | undefined
  workEndTime?: string | null | undefined
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
