"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PhoneInput } from "@/components/phone-input";
import { normalizePhoneToE164 } from "@/libs/utils/phone";
import { DangerZone } from "@/components/danger-zone";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z
    .string()
    .min(1, "Telefone obrigatório")
    .refine((val) => normalizePhoneToE164(val) !== null, "Telefone inválido"),
  document: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  departmentId: z.string().uuid("Departamento obrigatório"),
  status: z.enum(["active", "inactive"]),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
  workDays: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof schema>;
export type { FormValues as EmployeeFormValues };

interface Department {
  id: string;
  name: string;
}

export interface EmployeeEditData {
  id: string;
  name: string;
  phone: string;
  document: string | null;
  email: string | null;
  departmentId: string;
  status: string;
  workStartTime: string | null;
  workEndTime: string | null;
  workDays: number[] | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (values: FormValues) => void;
  loading?: boolean;
  employee: EmployeeEditData | null;
  departments: Department[];
}

const ALL_DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export function EditEmployeeModal({
  open,
  onClose,
  onSave,
  loading,
  employee,
  departments,
}: Props): React.ReactElement {
  const [showSchedule, setShowSchedule] = useState(
    (employee?.workStartTime?.length ?? 0) > 0 ||
      (employee?.workDays?.length ?? 0) > 0,
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    employee?.workDays ?? [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      document: "",
      email: "",
      departmentId: "",
      status: "active",
      workStartTime: "",
      workEndTime: "",
      workDays: [],
    },
  });

  const departmentIdValue = useWatch({
    control: form.control,
    name: "departmentId",
  });
  const statusValue = useWatch({ control: form.control, name: "status" });

  useEffect(() => {
    if (open && employee) {
      const days = employee.workDays ?? [];
      form.reset({
        name: employee.name,
        phone: employee.phone,
        document: employee.document ?? "",
        email: employee.email ?? "",
        departmentId: employee.departmentId,
        status: employee.status === "inactive" ? "inactive" : "active",
        workStartTime: employee.workStartTime ?? "",
        workEndTime: employee.workEndTime ?? "",
        workDays: days,
      });
    }
  }, [open, employee, form]);

  function toggleDay(day: number): void {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(next);
    form.setValue("workDays", next);
  }

  function handleSubmit(values: FormValues): void {
    onSave(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-md" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">
            Editar colaborador
          </DialogTitle>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-4 space-y-4"
          >
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Nome
              </Label>
              <Input
                {...form.register("name")}
                placeholder="Nome completo"
                style={{ borderRadius: 0 }}
              />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Telefone
              </Label>
              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    style={{ borderRadius: 0 }}
                    aria-invalid={fieldState.invalid}
                  />
                )}
              />
              {form.formState.errors.phone && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Documento (opcional)
              </Label>
              <Input
                {...form.register("document")}
                placeholder="Número do documento (opcional)"
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Email
              </Label>
              <Input
                {...form.register("email")}
                placeholder="email@exemplo.com"
                style={{ borderRadius: 0 }}
              />
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Departamento
              </Label>
              <NativeSelect
                value={departmentIdValue}
                onChange={(e) => form.setValue("departmentId", e.target.value)}
              >
                <option value="">Selecione...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
              {form.formState.errors.departmentId && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.departmentId.message}
                </p>
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
                {showSchedule ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {showSchedule && (
                <div className="p-4 space-y-4 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest">
                      Dias de trabalho
                    </Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {ALL_DAYS.map((day) => {
                        const active = selectedDays.includes(day.value);
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
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">
                        Início
                      </Label>
                      <Input
                        type="time"
                        {...form.register("workStartTime")}
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">
                        Fim
                      </Label>
                      <Input
                        type="time"
                        {...form.register("workEndTime")}
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Deixe em branco para herdar o horário do departamento.
                  </p>
                </div>
              )}
            </div>

            <DangerZone
              key={employee?.id}
              sectionTitle="Status do colaborador"
              currentStateLabel={statusValue === "active" ? "Colaborador ativo" : "Colaborador inativo"}
              currentStateVariant={statusValue === "active" ? "active" : "inactive"}
              actionTitle={statusValue === "active" ? "Desativar colaborador" : "Reativar colaborador"}
              actionDescription={
                statusValue === "active"
                  ? "O colaborador não participará de novos disparos de pesquisa."
                  : "O colaborador voltará a participar dos próximos disparos de pesquisa."
              }
              actionLabel={statusValue === "active" ? "Desativar" : "Reativar"}
              onAction={() => { form.setValue("status", statusValue === "active" ? "inactive" : "active") }}
              loading={loading}
              pendingSaveMessage="Clique em Salvar para confirmar a alteração."
            />

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
  );
}
