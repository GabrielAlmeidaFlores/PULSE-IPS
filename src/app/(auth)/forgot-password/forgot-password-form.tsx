"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { forgotPasswordAction } from "@/app/(auth)/forgot-password/actions"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  orgSlug: z.string().min(1, "Informe o identificador da organização"),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm(): React.ReactElement {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await forgotPasswordAction(values)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Se a conta existir, um e-mail de recuperação será enviado em instantes.")
      form.reset()
    }
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">RECUPERAR SENHA</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Informe seu e-mail e organização para receber o link de recuperação
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1">
          <label htmlFor="orgSlug" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Organização
          </label>
          <input
            id="orgSlug"
            type="text"
            placeholder="sua-empresa"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            style={{ borderRadius: 0 }}
            {...form.register("orgSlug")}
          />
          {form.formState.errors.orgSlug && (
            <p className="text-[11px] text-destructive">{form.formState.errors.orgSlug.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="voce@empresa.com"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            style={{ borderRadius: 0 }}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase px-4 py-3 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          style={{ borderRadius: 0 }}
        >
          {form.formState.isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
        </button>
      </form>

      <div className="border-t border-border px-6 py-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline uppercase tracking-wider">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
