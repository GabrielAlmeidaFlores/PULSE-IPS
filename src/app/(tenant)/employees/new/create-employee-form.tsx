"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createEmployeeAction } from "@/app/(tenant)/employees/new/actions"

const schema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
  workDays: z.array(z.number()).optional(),
})

type FormValues = z.infer<typeof schema>

interface Department {
  id: string
  name: string
}

interface Props {
  departments: Department[]
}

type ShiftPreset = "comercial" | "morning" | "afternoon" | "night" | "custom"

const SHIFT_PRESETS: Record<ShiftPreset, { label: string; start: string; end: string } | null> = {
  comercial: { label: "Comercial (09:00–18:00)", start: "09:00", end: "18:00" },
  morning: { label: "Manhã (06:00–14:00)", start: "06:00", end: "14:00" },
  afternoon: { label: "Tarde (14:00–22:00)", start: "14:00", end: "22:00" },
  night: { label: "Noturno (22:00–06:00)", start: "22:00", end: "06:00" },
  custom: null,
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

export function CreateEmployeeForm({ departments }: Props): React.ReactElement {
  const router = useRouter()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [showSchedule, setShowSchedule] = useState(false)
  const [shiftPreset, setShiftPreset] = useState<ShiftPreset | "">("")
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  function applyPreset(preset: ShiftPreset): void {
    setShiftPreset(preset)
    const p = SHIFT_PRESETS[preset]
    if (p) {
      form.setValue("workStartTime", p.start)
      form.setValue("workEndTime", p.end)
    }
  }

  function toggleDay(day: number): void {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    setSelectedDays(next)
    form.setValue("workDays", next.length > 0 ? next : undefined)
  }

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await createEmployeeAction({
      ...values,
      email: values.email === "" ? undefined : values.email,
      workStartTime: values.workStartTime !== "" ? values.workStartTime : undefined,
      workEndTime: values.workEndTime !== "" ? values.workEndTime : undefined,
      workDays: values.workDays && values.workDays.length > 0 ? values.workDays : undefined,
    })
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Funcionário cadastrado")
    router.push("/employees")
  }

  const fieldCls = "text-[10px] font-bold tracking-widest uppercase text-muted-foreground"

  return (
    <div className="border border-border bg-card max-w-lg">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest">Dados do funcionário</span>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className={fieldCls}>Departamento</Label>
          <select
            style={{ borderRadius: 0 }}
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
            onChange={(e) => form.setValue("departmentId", e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Selecione o departamento</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          {form.formState.errors.departmentId && (
            <p className="text-xs text-destructive">Selecione um departamento</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className={fieldCls}>Nome completo</Label>
          <Input placeholder="Nome do funcionário" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className={fieldCls}>Telefone</Label>
          <Input placeholder="(11) 99999-9999" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className={fieldCls}>E-mail (opcional)</Label>
          <Input type="email" placeholder="funcionario@empresa.com" {...form.register("email")} />
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
              <span className="text-muted-foreground font-normal">(opcional — herda do departamento)</span>
            </span>
            {showSchedule ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {showSchedule && (
            <div className="p-4 space-y-4 border-t border-border">
              <div className="space-y-1.5">
                <Label className={fieldCls}>Dias de trabalho</Label>
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
              <div className="space-y-1.5">
                <Label className={fieldCls}>Turno</Label>
                <select
                  value={shiftPreset}
                  onChange={(e) => applyPreset(e.target.value as ShiftPreset)}
                  className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  style={{ borderRadius: 0 }}
                >
                  <option value="">Selecione um turno...</option>
                  <option value="comercial">Comercial (09:00–18:00)</option>
                  <option value="morning">Manhã (06:00–14:00)</option>
                  <option value="afternoon">Tarde (14:00–22:00)</option>
                  <option value="night">Noturno (22:00–06:00)</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              {(shiftPreset === "custom" || shiftPreset !== "") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={fieldCls}>Início</Label>
                    <Input type="time" {...form.register("workStartTime")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={fieldCls}>Fim</Label>
                    <Input type="time" {...form.register("workEndTime")} />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Deixe em branco para herdar o horário do departamento.</p>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button type="submit" className="h-11" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Cadastrando..." : "Cadastrar funcionário"}
          </Button>
        </div>
      </form>
    </div>
  )
}
