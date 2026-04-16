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
import { updateEmployeeAction, deactivateEmployeeAction, sendConsentInviteAction } from "@/app/(tenant)/employees/[id]/actions"

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().min(8, "Telefone inválido"),
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
  email: string | null
  status: string
  departmentId: string
  workStartTime: string | null
  workEndTime: string | null
  department: { name: string }
}

interface Props {
  employee: Employee
  departments: Department[]
}

export function EmployeeDetail({ employee, departments }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isSendingConsent, setIsSendingConsent] = useState(false)
  const [showSchedule, setShowSchedule] = useState(Boolean(employee.workStartTime))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: employee.name,
      phone: employee.phone,
      email: employee.email ?? "",
      departmentId: employee.departmentId,
      workStartTime: employee.workStartTime ?? "",
      workEndTime: employee.workEndTime ?? "",
    },
  })

  function onSubmit(values: FormValues): void {
    startTransition(async () => {
      const result = await updateEmployeeAction(employee.id, {
        ...values,
        email: values.email === "" ? null : values.email,
        workStartTime: values.workStartTime ?? null,
        workEndTime: values.workEndTime ?? null,
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
    toast.success("Colaborador desativado.")
    router.push("/employees")
  }

  async function handleSendConsentInvite(): Promise<void> {
    setIsSendingConsent(true)
    const result = await sendConsentInviteAction(employee.id)
    setIsSendingConsent(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Convite de consentimento enviado.")
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
          <Label className="text-[10px] font-bold uppercase tracking-widest">Email</Label>
          <Input {...form.register("email")} placeholder="email@exemplo.com" />
          {form.formState.errors.email && (
            <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest">Departamento</Label>
          <select
            style={{ borderRadius: 0 }}
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
            defaultValue={employee.departmentId}
            onChange={(e) => form.setValue("departmentId", e.target.value)}
          >
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
              Horário personalizado{" "}
              <span className="text-muted-foreground font-normal normal-case">
                {employee.workStartTime
                  ? `${employee.workStartTime} – ${employee.workEndTime}`
                  : "(herda do departamento)"}
              </span>
            </span>
            {showSchedule ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {showSchedule && (
            <div className="p-4 space-y-3 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
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
        <div className="border border-border bg-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Consentimento</p>
          <p className="text-xs text-muted-foreground mb-4">Envie um link de consentimento para o colaborador via e-mail ou WhatsApp.</p>
          <Button
            variant="outline"
            onClick={handleSendConsentInvite}
            disabled={isSendingConsent}
            className="rounded-none text-[11px] font-bold uppercase tracking-widest"
          >
            {isSendingConsent ? "Enviando..." : "Enviar Convite de Consentimento"}
          </Button>
        </div>
      )}

      {employee.status === "active" && (
        <div className="border border-destructive/30 bg-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Zona de perigo</p>
          <p className="text-xs text-muted-foreground mb-4">Desativar o colaborador impedirá que ele receba pesquisas.</p>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isDeactivating}
            className="rounded-none text-[11px] font-bold uppercase tracking-widest"
          >
            {isDeactivating ? "Desativando..." : "Desativar colaborador"}
          </Button>
        </div>
      )}
    </div>
  )
}
