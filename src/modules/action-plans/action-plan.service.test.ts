import { describe, it, expect, vi, beforeEach } from "vitest"
import { updatePlan, createPlanWithTasks, completeTask, getActionPlans, getActionPlan, addTask, createPlan, getActionPlansPaginated } from "@/modules/action-plans/action-plan.service"
import {
  updateActionPlan,
  createActionPlanWithTasks,
  completeActionPlanTask,
  findActionPlansByTenant,
  findActionPlanById,
  createActionPlanTask,
  createActionPlan,
  findActionPlansForListingPage,
  type ActionPlanListingFilters,
} from "@/modules/action-plans/action-plan.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import type { CreateActionPlanTaskInput, CreateActionPlanInput } from "@/modules/action-plans/action-plan.types"

vi.mock("@/modules/action-plans/action-plan.repository")
vi.mock("@/modules/audit/audit.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockCreateAuditLog = vi.mocked(createAuditLog)
const mockUpdateActionPlan = vi.mocked(updateActionPlan)
const mockCreateActionPlanWithTasks = vi.mocked(createActionPlanWithTasks)
const mockCompleteActionPlanTask = vi.mocked(completeActionPlanTask)
const mockFindActionPlansByTenant = vi.mocked(findActionPlansByTenant)
const mockFindActionPlanById = vi.mocked(findActionPlanById)
const mockCreateActionPlanTask = vi.mocked(createActionPlanTask)
const mockCreateActionPlan = vi.mocked(createActionPlan)
const mockFindActionPlansForListingPage = vi.mocked(findActionPlansForListingPage)

const TENANT_ID = "tenant-1"
const PLAN = { id: "plan-1", tenantId: TENANT_ID, title: "Reduzir estresse", status: "open" }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateAuditLog.mockResolvedValue(undefined)
  mockUpdateActionPlan.mockResolvedValue({ count: 1 })
  mockCreateActionPlanWithTasks.mockResolvedValue(PLAN as Awaited<ReturnType<typeof createActionPlanWithTasks>>)
  mockCompleteActionPlanTask.mockResolvedValue({ id: "task-1" } as Awaited<ReturnType<typeof completeActionPlanTask>>)
})

describe("updatePlan", () => {
  it("passes input to updateActionPlan as-is for non-completed status", async () => {
    await updatePlan(TENANT_ID, PLAN.id, { status: "in_progress" }, "user-1")

    expect(mockUpdateActionPlan).toHaveBeenCalledWith(TENANT_ID, PLAN.id, { status: "in_progress" })
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, userId: "user-1", action: "action_plan.updated" }),
    )
  })

  it("adds completedAt timestamp when status is completed", async () => {
    await updatePlan(TENANT_ID, PLAN.id, { status: "completed" })

    expect(mockUpdateActionPlan).toHaveBeenCalledWith(
      TENANT_ID,
      PLAN.id,
      expect.objectContaining({ status: "completed", completedAt: expect.any(Date) as Date }),
    )
  })

  it("does not add completedAt for open status", async () => {
    await updatePlan(TENANT_ID, PLAN.id, { status: "open" })

    const callArg = mockUpdateActionPlan.mock.calls[0]?.[2]
    expect(callArg).not.toHaveProperty("completedAt")
  })
})

describe("createPlanWithTasks", () => {
  it("creates plan with tasks and registers audit log", async () => {
    const input = { title: "Plano novo", description: "desc", origin: "metric_alert" as const, departmentId: "dept-1" }
    const tasks = ["Tarefa 1", "Tarefa 2"]

    await createPlanWithTasks(TENANT_ID, input, tasks, "user-1")

    expect(mockCreateActionPlanWithTasks).toHaveBeenCalledWith(TENANT_ID, input, tasks)
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, userId: "user-1", action: "action_plan.created" }),
    )
  })

  it("registra audit log sem userId quando actorId não é fornecido", async () => {
    const input = { title: "Plano novo", description: "desc", origin: "metric_alert" as const }

    await createPlanWithTasks(TENANT_ID, input, [], undefined)

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.not.objectContaining({ userId: expect.anything() as string }),
    )
  })
})

describe("completeTask", () => {
  it("marks task as completed and returns it", async () => {
    const task = await completeTask(TENANT_ID, "task-1")
    expect(mockCompleteActionPlanTask).toHaveBeenCalledWith(TENANT_ID, "task-1")
    expect(task).toEqual({ id: "task-1" })
  })
})

describe("getActionPlans", () => {
  it("returns action plans for the given tenant", async () => {
    mockFindActionPlansByTenant.mockResolvedValue([PLAN] as Awaited<ReturnType<typeof findActionPlansByTenant>>)

    const result = await getActionPlans(TENANT_ID)
    expect(result).toEqual([PLAN])
    expect(mockFindActionPlansByTenant).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("getActionPlan", () => {
  it("returns a single action plan by id", async () => {
    mockFindActionPlanById.mockResolvedValue(PLAN as Awaited<ReturnType<typeof findActionPlanById>>)

    const result = await getActionPlan(TENANT_ID, PLAN.id)
    expect(result).toEqual(PLAN)
    expect(mockFindActionPlanById).toHaveBeenCalledWith(TENANT_ID, PLAN.id)
  })
})

describe("addTask", () => {
  it("adds task to action plan and returns the created task", async () => {
    const task = {
      id: "task-1",
      tenantId: TENANT_ID,
      actionPlanId: PLAN.id,
      title: "Tarefa",
      assigneeId: null,
      dueDate: new Date("2024-06-01"),
      completedAt: null,
      createdAt: new Date(),
    }
    mockCreateActionPlanTask.mockResolvedValue(task)

    const input: CreateActionPlanTaskInput = { title: "Tarefa", dueDate: new Date("2024-06-01") }
    const result = await addTask(TENANT_ID, PLAN.id, input)
    expect(result).toEqual(task)
    expect(mockCreateActionPlanTask).toHaveBeenCalledWith(TENANT_ID, PLAN.id, input)
  })
})

describe("createPlan", () => {
  it("delega criação ao repository e registra log de auditoria", async () => {
    mockCreateActionPlan.mockResolvedValue(PLAN as Awaited<ReturnType<typeof createActionPlan>>)

    const input: CreateActionPlanInput = { title: "Reduzir estresse", description: "Ações para reduzir estresse", alertId: "alert-1" }
    const result = await createPlan(TENANT_ID, input, "user-1")

    expect(mockCreateActionPlan).toHaveBeenCalledWith(TENANT_ID, input)
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, userId: "user-1", action: "action_plan.created" }),
    )
    expect(result).toEqual(PLAN)
  })

  it("registra audit log sem userId quando actorId não é fornecido", async () => {
    mockCreateActionPlan.mockResolvedValue(PLAN as Awaited<ReturnType<typeof createActionPlan>>)

    const input: CreateActionPlanInput = { title: "Reduzir estresse", description: "Ações para reduzir estresse" }
    await createPlan(TENANT_ID, input)

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.not.objectContaining({ userId: expect.anything() as string }),
    )
  })
})

describe("getActionPlansPaginated", () => {
  it("calcula skip e repassa filtros ao repository", async () => {
    mockFindActionPlansForListingPage.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findActionPlansForListingPage>>)

    await getActionPlansPaginated(TENANT_ID, { page: 2, pageSize: 10, q: "estresse", status: "open" })

    const expectedFilters: ActionPlanListingFilters = { q: "estresse", status: "open" }
    expect(mockFindActionPlansForListingPage).toHaveBeenCalledWith(TENANT_ID, expectedFilters, 10, 10)
  })

  it("omite filtros ausentes", async () => {
    mockFindActionPlansForListingPage.mockResolvedValue({ items: [], total: 0 } as Awaited<ReturnType<typeof findActionPlansForListingPage>>)

    await getActionPlansPaginated(TENANT_ID, { page: 1, pageSize: 5 })

    expect(mockFindActionPlansForListingPage).toHaveBeenCalledWith(TENANT_ID, {}, 0, 5)
  })
})
