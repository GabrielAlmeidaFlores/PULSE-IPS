"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { superAdminLoginAction } from "@/app/(super-admin-public)/super-admin/login/actions"
import { PasswordInput } from "@/components/ui/password-input"

const schema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres." }),
})

type FormValues = z.infer<typeof schema>

export function SuperAdminLoginForm(): React.ReactElement {
  const router = useRouter()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await superAdminLoginAction(values)
    if (result.error) {
      toast.error(result.error)
      return
    }
    router.push("/super-admin/dashboard")
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">ADMIN CONSOLE</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Acesso restrito — credenciais de super administrador</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="admin@pulse.com"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            style={{ borderRadius: 0 }}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Senha
          </label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-[11px] text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase px-4 py-3 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          style={{ borderRadius: 0 }}
        >
          {form.formState.isSubmitting ? "Autenticando..." : "Entrar"}
        </button>
      </form>
    </div>
  )
}

