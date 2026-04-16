export interface Department {
  id: string
  tenantId: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateDepartmentInput {
  name: string
}

export interface UpdateDepartmentInput {
  name?: string
  isActive?: boolean
}
