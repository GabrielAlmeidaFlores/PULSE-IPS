"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { createActionPlanAction } from "@/app/(tenant)/action-plans/new/actions"
import { NativeSelect } from "@/components/ui/native-select"

const schema = z.object({
  title: z.string().min(1, { message: "Informe o título do plano de ação." }),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
})

type FormValues = z.infer<typeof schema>

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
const labelCls = "text-[10px] font-bold tracking-widest uppercase text-muted-foreground"

export function CreateActionPlanForm(): React.ReactElement {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium" },
  })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await createActionPlanAction({
      title: values.title,
      priority: values.priority,
      ...(values.description ? { description: values.description } : {}),
    })
    if (result?.error) {
      toast.error(result.error)
    }
  }

  return (
    <div className="border border-border bg-card max-w-lg">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest">Dados do plano</span>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Título</label>
          <input
            className={inputCls}
            style={{ borderRadius: 0 }}
            placeholder="Nome do plano de ação"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">Título é obrigatório.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Descrição (opcional)</label>
          <textarea
            className={inputCls}
            style={{ borderRadius: 0 }}
            placeholder="Descreva o objetivo deste plano"
            rows={3}
            {...form.register("description")}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Prioridade</label>
          <NativeSelect
            {...form.register("priority")}
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </NativeSelect>
        </div>
        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors"
            style={{ borderRadius: 0 }}
          >
            {form.formState.isSubmitting ? "Criando..." : "Criar Plano de Ação"}
          </button>
          <Link
            href="/action-plans"
            className="border border-border text-muted-foreground hover:bg-muted px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors"
            style={{ borderRadius: 0 }}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
