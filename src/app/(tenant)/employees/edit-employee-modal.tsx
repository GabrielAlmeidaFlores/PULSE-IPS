"use client"

import { useState, useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().min(8, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  departmentId: z.string().uuid("Departamento obrigatório"),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
export type { FormValues as EmployeeFormValues }

interface Department {
  id: string
  name: string
}

export interface EmployeeEditData {
  id: string
  name: string
  phone: string
  email: string | null
  departmentId: string
  workStartTime: string | null
  workEndTime: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (values: FormValues) => void
  loading?: boolean
  employee: EmployeeEditData | null
  departments: Department[]
}

export function EditEmployeeModal({ open, onClose, onSave, loading, employee, departments }: Props): React.ReactElement {
  const [showSchedule, setShowSchedule] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      departmentId: "",
      workStartTime: "",
      workEndTime: "",
    },
  })

  useEffect(() => {
    if (open && employee) {
      form.reset({
        name: employee.name,
        phone: employee.phone,
        email: employee.email ?? "",
        departmentId: employee.departmentId,
        workStartTime: employee.workStartTime ?? "",
        workEndTime: employee.workEndTime ?? "",
      })
      setShowSchedule(Boolean(employee.workStartTime))
    }
  }, [open, employee, form])

  function handleSubmit(values: FormValues): void {
    onSave(values)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-md" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">Editar colaborador</DialogTitle>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Nome</Label>
              <Input {...form.register("name")} placeholder="Nome completo" style={{ borderRadius: 0 }} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Telefone</Label>
              <Input {...form.register("phone")} placeholder="+55 11 99999-9999" style={{ borderRadius: 0 }} />
              {form.formState.errors.phone && (
                <p className="text-[11px] text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Email</Label>
              <Input {...form.register("email")} placeholder="email@exemplo.com" style={{ borderRadius: 0 }} />
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Departamento</Label>
              <select
                style={{ borderRadius: 0 }}
                className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
                value={form.watch("departmentId")}
                onChange={(e) => form.setValue("departmentId", e.target.value)}
              >
                <option value="">Selecione...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
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
                  Horário personalizado
                </span>
                {showSchedule ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showSchedule && (
                <div className="p-4 space-y-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">Início</Label>
                      <Input type="time" {...form.register("workStartTime")} style={{ borderRadius: 0 }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">Fim</Label>
                      <Input type="time" {...form.register("workEndTime")} style={{ borderRadius: 0 }} />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Deixe em branco para herdar o horário do departamento.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </DialogClose>
              <button
                type="submit"
                disabled={loading}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
