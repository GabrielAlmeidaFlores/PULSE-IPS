"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useCallback } from "react"
import { createOrgByAdminSchema } from "@/modules/organizations/organization.schema"
import { createOrgByAdminAction } from "@/app/(super-admin)/super-admin/organizations/new/actions"
import { NativeSelect } from "@/components/ui/native-select"
import type { z } from "zod"

type FormValues = z.infer<typeof createOrgByAdminSchema>

const TIMEZONES: Record<string, string> = {
  "America/Sao_Paulo":  "São Paulo (UTC-3)",
  "America/Fortaleza":  "Fortaleza / Recife / Natal (UTC-3)",
  "America/Belem":      "Belém / Macapá (UTC-3)",
  "America/Manaus":     "Manaus (UTC-4)",
  "America/Rio_Branco": "Rio Branco / Acre (UTC-5)",
  "America/Noronha":    "Fernando de Noronha (UTC-2)",
}

interface PlanOption {
  id: string
  name: string
}

interface Props {
  plans: PlanOption[]
}

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

function AdminField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string | undefined
  error?: string | undefined
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
        {label}
      </label>
      {children}
      {hint !== undefined && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error !== undefined && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

export function CreateOrgForm({ plans }: Props): React.ReactElement {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(createOrgByAdminSchema),
    defaultValues: {
      name: "",
      slug: "",
      adminEmail: "",
      planId: undefined,
      timezone: "America/Sao_Paulo",
    },
  })

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value
      form.setValue("name", value)
      if (form.getValues("slug") === slugify(form.getValues("name").slice(0, -1))) {
        form.setValue("slug", slugify(value))
      }
    },
    [form],
  )

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await createOrgByAdminAction(values)
    if (result.error !== undefined) {
      toast.error(result.error)
      return
    }
    toast.success("Organização criada. Convite enviado ao admin.")
    router.push("/super-admin/organizations")
  }

  return (
    <div className="max-w-lg border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-5 py-3 border-l-4 border-l-primary">
        <span className="text-[11px] font-black tracking-widest uppercase text-foreground">
          Dados da Organização
        </span>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
        <AdminField
          label="Nome da empresa"
          error={form.formState.errors.name?.message}
        >
          <input
            type="text"
            placeholder="Acme Ltda"
            className={inputCls}
            style={{ borderRadius: 0 }}
            {...form.register("name")}
            onChange={handleNameChange}
          />
        </AdminField>

        <AdminField
          label="Identificador (slug)"
          hint="Usado no login: acme → app.pulseips.com.br/acme. Somente letras minúsculas, números e hifens."
          error={form.formState.errors.slug?.message}
        >
          <input
            type="text"
            placeholder="acme"
            className={inputCls}
            style={{ borderRadius: 0 }}
            {...form.register("slug")}
          />
        </AdminField>

        <AdminField
          label="E-mail do administrador"
          hint="Receberá o convite de primeiro acesso."
          error={form.formState.errors.adminEmail?.message}
        >
          <input
            type="email"
            placeholder="admin@acme.com.br"
            className={inputCls}
            style={{ borderRadius: 0 }}
            {...form.register("adminEmail")}
          />
        </AdminField>

        <AdminField
          label="Plano (opcional)"
          error={form.formState.errors.planId?.message}
        >
          <NativeSelect
            {...form.register("planId")}
            onChange={(e) => {
              form.setValue(
                "planId",
                e.target.value !== "" ? e.target.value : undefined,
                { shouldValidate: true },
              )
            }}
          >
            <option value="">— Sem plano —</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </NativeSelect>
        </AdminField>

        <AdminField
          label="Fuso horário"
          error={form.formState.errors.timezone?.message}
        >
          <NativeSelect {...form.register("timezone")}>
            {Object.entries(TIMEZONES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </AdminField>

        <div className="pt-2">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 0 }}
          >
            {form.formState.isSubmitting ? "Criando..." : "Criar e enviar convite"}
          </button>
        </div>
      </form>
    </div>
  )
}
