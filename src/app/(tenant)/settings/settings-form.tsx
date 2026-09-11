"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { updateOrganizationAction } from "@/app/(tenant)/settings/actions"
import { NativeSelect } from "@/components/ui/native-select"

const schema = z.object({
  name: z.string().min(1, { message: "Informe o nome da organização." }),
  timezone: z.string().min(1, { message: "Selecione o fuso horário." }),
})

type FormValues = z.infer<typeof schema>

interface Props {
  name: string
  timezone: string
}

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
const labelCls = "text-[10px] font-bold tracking-widest uppercase text-muted-foreground"

export function SettingsForm({ name, timezone }: Props): React.ReactElement {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name, timezone },
  })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await updateOrganizationAction(values)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Dados atualizados")
  }

  return (
    <div className="border border-border bg-card max-w-lg">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest">Editar dados</span>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Nome da organização</label>
          <input
            className={inputCls}
            style={{ borderRadius: 0 }}
            placeholder="Nome da organização"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">Nome é obrigatório.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Fuso horário</label>
          <NativeSelect
            {...form.register("timezone")}
          >
            <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
            <option value="America/Manaus">Manaus (UTC-4)</option>
            <option value="America/Rio_Branco">Rio Branco / Acre (UTC-5)</option>
            <option value="America/Noronha">Fernando de Noronha (UTC-2)</option>
            <option value="America/Fortaleza">Fortaleza / Recife / Natal (UTC-3, sem horário de verão)</option>
            <option value="America/Belem">Belém / Macapá (UTC-3, sem horário de verão)</option>
            <option value="America/Boa_Vista">Boa Vista (UTC-4)</option>
            <option value="America/Porto_Velho">Porto Velho (UTC-4)</option>
            <option value="America/Cuiaba">Cuiabá (UTC-4)</option>
            <option value="America/Campo_Grande">Campo Grande (UTC-4)</option>
          </NativeSelect>
          {form.formState.errors.timezone && (
            <p className="text-xs text-destructive">Fuso horário é obrigatório.</p>
          )}
          <p className="text-[11px] text-muted-foreground">Define o horário local usado para decidir quando enviar pesquisas.</p>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors"
            style={{ borderRadius: 0 }}
          >
            {form.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  )
}
