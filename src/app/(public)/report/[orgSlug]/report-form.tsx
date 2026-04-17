"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitReportAction } from "@/app/(public)/report/[orgSlug]/actions"

const CATEGORIES = [
  { value: "harassment", label: "Assédio" },
  { value: "discrimination", label: "Discriminação" },
  { value: "conflict", label: "Conflito interpessoal" },
  { value: "overload", label: "Sobrecarga de trabalho" },
  { value: "mental_health", label: "Saúde mental" },
  { value: "safety", label: "Segurança no trabalho" },
  { value: "physical_environment", label: "Ambiente físico" },
  { value: "management", label: "Gestão / liderança" },
  { value: "other", label: "Outro" },
]

const schema = z.object({
  content: z.string().min(10).max(5000),
  category: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  orgSlug: string
}

export function ReportForm({ orgSlug }: Props): React.ReactElement {
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await submitReportAction(orgSlug, values)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Relato enviado</h2>
        <p className="text-sm text-muted-foreground">Seu relato anonimo foi registrado com sucesso.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">Canal de relatos anonimos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Sua identidade nao sera revelada</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Categoria (opcional)
          </Label>
          <select
            {...form.register("category")}
            style={{ borderRadius: 0 }}
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
          >
            <option value="">Selecione uma categoria...</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Descricao
          </Label>
          <Textarea
            {...form.register("content")}
            rows={6}
            placeholder="Descreva a situacao com o maximo de detalhes possivel..."
          />
          {form.formState.errors.content && (
            <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full h-11" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Enviando..." : "Enviar anonimamente"}
        </Button>
      </form>
    </div>
  )
}
