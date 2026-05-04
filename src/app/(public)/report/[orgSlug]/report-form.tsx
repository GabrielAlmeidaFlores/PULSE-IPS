"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"
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
  content: z.string().min(10, { message: "O relato deve ter no mínimo 10 caracteres." }).max(5000, { message: "O relato deve ter no máximo 5000 caracteres." }),
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
        <p className="text-sm text-muted-foreground">Seu relato anônimo foi registrado com sucesso.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">Canal de relatos anônimos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Sua identidade não será revelada</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Categoria (opcional)
          </Label>
          <NativeSelect
            {...form.register("category")}
          >
            <option value="">Selecione uma categoria...</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Descrição
          </Label>
          <Textarea
            {...form.register("content")}
            rows={6}
            placeholder="Descreva a situação com o máximo de detalhes possível..."
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
