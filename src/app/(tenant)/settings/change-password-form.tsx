"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { changePasswordAction } from "@/app/(tenant)/settings/actions"

export function ChangePasswordForm(): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })

  function update(field: string, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(): void {
    startTransition(async () => {
      const result = await changePasswordAction(form)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Senha alterada com sucesso.")
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    })
  }

  return (
    <div className="border border-border bg-card max-w-lg">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest">Alterar Senha</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {field === "currentPassword" && "Senha atual"}
              {field === "newPassword" && "Nova senha"}
              {field === "confirmPassword" && "Confirmar nova senha"}
            </p>
            <input
              type="password"
              value={form[field]}
              onChange={(e) => update(field, e.target.value)}
              className="w-full bg-input border border-border text-foreground text-[12px] px-3 py-2 focus:outline-none focus:border-primary"
              style={{ borderRadius: 0 }}
              disabled={isPending}
            />
          </div>
        ))}
        <button
          onClick={handleSubmit}
          disabled={isPending || !form.currentPassword || !form.newPassword || !form.confirmPassword}
          style={{ borderRadius: 0 }}
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Alterando..." : "Alterar Senha"}
        </button>
      </div>
    </div>
  )
}
