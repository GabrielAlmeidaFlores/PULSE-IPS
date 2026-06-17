"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { updateEmployeeAction, deactivateEmployeeAction } from "@/app/(tenant)/employees/[id]/actions"
import { ConfirmActionModal } from "@/components/confirm-action-modal"

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().min(8, "Telefone inválido"),
  document: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  departmentId: z.string().uuid("Departamento obrigatório"),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Department {
  id: string
  name: string
}

interface Employee {
  id: string
  name: string
  phone: string
  document: string | null
  email: string | null
  status: string
  departmentId: string
  workStartTime: string | null
  workEndTime: string | null
  workDays: { dayOfWeek: number }[]
  department: { name: string }
}

interface Props {
  employee: Employee
  departments: Department[]
}

const ALL_DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
]

export function EmployeeDetail({ employee, departments }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const hasCustomSchedule = Boolean(employee.workStartTime) || employee.workDays.length > 0
  const [showSchedule, setShowSchedule] = useState(hasCustomSchedule)
  const [selectedDays, setSelectedDays] = useState<number[]>(employee.workDays.map((w) => w.dayOfWeek))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: employee.name,
      phone: employee.phone,
      document: employee.document ?? "",
      email: employee.email ?? "",
      departmentId: employee.departmentId,
      workStartTime: employee.workStartTime ?? "",
      workEndTime: employee.workEndTime ?? "",
    },
  })

  function toggleDay(day: number): void {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function onSubmit(values: FormValues): void {
    startTransition(async () => {
      const result = await updateEmployeeAction(employee.id, {
        ...values,
        document: values.document === "" ? null : (values.document ?? null),
        email: values.email === "" ? null : values.email,
        workStartTime: values.workStartTime ?? null,
        workEndTime: values.workEndTime ?? null,
        workDays: selectedDays.length > 0 ? selectedDays : null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Colaborador atualizado.")
      router.refresh()
    })
  }

  async function handleDeactivate(): Promise<void> {
    setIsDeactivating(true)
    const result = await deactivateEmployeeAction(employee.id)
    setIsDeactivating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setShowDeactivateModal(false)
    toast.success("Colaborador desativado.")
    router.push("/employees")
  }

  return (
    <div className="space-y-6 max-w-xl">
      <form onSubmit={form.handleSubmit(onSubmit)} className="border border-border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest">Nome</Label>
          <Input {...form.register("name")} placeholder="Nome completo" />
          {form.formState.errors.name && (
            <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest">Telefone</Label>
          <Input {...form.register("phone")} placeholder="+55 11 99999-9999" />
          {form.formState.errors.phone && (
            <p className="text-[11px] text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest">Documento (opcional)</Label>
          <Input {...form.register("document")} placeholder="Número do documento (opcional)" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest">Email</Label>
          <Input {...form.register("email")} placeholder="email@exemplo.com" />
          {form.formState.errors.email && (
            <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest">Departamento</Label>
          <NativeSelect
            defaultValue={employee.departmentId}
            onChange={(e) => form.setValue("departmentId", e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </NativeSelect>
          {form.formState.errors.departmentId && (
            <p className="text-[11px] text-destructive">{form.formState.errors.departmentId.message}</p>
          )}
        </div>

        <div className="border border-border" style={{ borderRadius: 0 }}>
          <button
            type="button"
            onClick={() => setShowSchedule((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted hover:bg-muted/80 transition-colors"
            style={{ borderRadius: 0 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Horário personalizado{" "}
              <span className="text-muted-foreground font-normal normal-case">
                {hasCustomSchedule ? "configurado" : "(herda do departamento)"}
              </span>
            </span>
            {showSchedule ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {showSchedule && (
            <div className="p-4 space-y-4 border-t border-border">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Dias de trabalho</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {ALL_DAYS.map((day) => {
                    const active = selectedDays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        style={{ borderRadius: 0 }}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest">Início</Label>
                  <Input type="time" {...form.register("workStartTime")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest">Fim</Label>
                  <Input type="time" {...form.register("workEndTime")} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Deixe em branco para herdar o horário configurado no departamento.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className="rounded-none text-[11px] font-bold uppercase tracking-widest">
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>

      {employee.status === "active" && (
        <div className="border border-destructive/30 bg-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Zona de perigo</p>
          <p className="text-xs text-muted-foreground mb-4">Desativar o colaborador impedirá que ele receba pesquisas.</p>
          <Button
            variant="destructive"
            onClick={() => setShowDeactivateModal(true)}
            disabled={isDeactivating}
            className="rounded-none text-[11px] font-bold uppercase tracking-widest"
          >
            Desativar colaborador
          </Button>
        </div>
      )}

      <ConfirmActionModal
        open={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivate}
        loading={isDeactivating}
        title="Desativar colaborador"
        description={`Tem certeza que deseja desativar "${employee.name}"? O colaborador deixará de receber pesquisas.`}
        confirmLabel="Desativar"
        variant="destructive"
      />
    </div>
  )
}
