export interface Department {
  id: string
  tenantId: string
  name: string
  isActive: boolean
  workStartTime: string
  workEndTime: string
  workDays: number[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateDepartmentInput {
  name: string
  workStartTime?: string
  workEndTime?: string
  workDays?: number[]
}

export interface UpdateDepartmentInput {
  name?: string
  isActive?: boolean
  workStartTime?: string
  workEndTime?: string
  workDays?: number[]
}
