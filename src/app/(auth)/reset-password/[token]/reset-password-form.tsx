"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { resetPasswordAction } from "@/app/(auth)/reset-password/[token]/actions"
import { PasswordInput } from "@/components/ui/password-input"

const schema = z.object({
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres." }),
  confirmPassword: z.string().min(8, { message: "A confirmação deve ter no mínimo 8 caracteres." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
})

type FormValues = z.infer<typeof schema>

interface Props {
  token: string
}

export function ResetPasswordForm({ token }: Props): React.ReactElement {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await resetPasswordAction({ token, newPassword: values.password })
    if (result?.error) {
      toast.error(result.error)
    }
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">REDEFINIR SENHA</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Escolha uma nova senha segura para sua conta</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1">
          <label htmlFor="password" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Nova senha
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

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Confirmar nova senha
          </label>
          <PasswordInput
            id="confirmPassword"
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
          {form.formState.isSubmitting ? "Redefinindo..." : "Redefinir senha"}
        </button>
      </form>

      <div className="border-t border-border px-6 py-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          <Link href="/login" className="text-primary font-bold hover:underline uppercase tracking-wider">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
