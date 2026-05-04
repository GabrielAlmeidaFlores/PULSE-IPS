"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { acceptInviteAction } from "@/app/(onboarding)/invite/[token]/actions"
import { PasswordInput } from "@/components/ui/password-input"

const schema = z.object({
  name: z.string().min(1, { message: "Informe seu nome." }),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres." }),
  confirmPassword: z.string().min(8, { message: "A confirmação deve ter no mínimo 8 caracteres." }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
})

type FormValues = z.infer<typeof schema>

interface Props {
  token: string
  email: string
  orgName: string
}

export function AcceptInviteForm({ token, email, orgName }: Props): React.ReactElement {
  const router = useRouter()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await acceptInviteAction(token, values.password, values.name)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Conta criada! Faça login para continuar.")
    router.push("/login")
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">ACEITAR CONVITE</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Você foi convidado para <strong className="text-foreground">{orgName}</strong> — crie sua senha para continuar
        </p>
      </div>

      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">E-mail</p>
        <p className="text-[12px] font-mono text-foreground">{email}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Nome completo
          </label>
          <input
            type="text"
            placeholder="Seu nome"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            style={{ borderRadius: 0 }}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Senha
          </label>
          <PasswordInput
            placeholder="••••••••"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-[11px] text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Confirmar senha
          </label>
          <PasswordInput
            placeholder="••••••••"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-[11px] text-destructive">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase px-4 py-3 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          style={{ borderRadius: 0 }}
        >
          {form.formState.isSubmitting ? "Criando conta..." : "Criar conta e acessar"}
        </button>
      </form>

      <div className="border-t border-border px-6 py-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline uppercase tracking-wider">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
