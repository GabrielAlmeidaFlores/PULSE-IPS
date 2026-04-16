"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { inviteUserAction } from "@/app/(tenant)/settings/actions"
import type { OrganizationUser } from "@prisma/client"

interface Props {
  users: OrganizationUser[]
}

export function TeamManagement({ users }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "rh">("rh")
  const [showForm, setShowForm] = useState(false)

  function handleInvite(): void {
    startTransition(async () => {
      const result = await inviteUserAction({ email, role })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Convite enviado para ${email}.`)
      setEmail("")
      setRole("rh")
      setShowForm(false)
    })
  }

  return (
    <div className="border border-border bg-card max-w-lg">
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest">Equipe</span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ borderRadius: 0 }}
          className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors"
        >
          Convidar
        </button>
      </div>

      {showForm && (
        <div className="border-b border-border px-4 py-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="flex-1 bg-input border border-border text-foreground text-[12px] px-3 py-2 focus:outline-none focus:border-primary"
              style={{ borderRadius: 0 }}
              disabled={isPending}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "rh")}
              className="bg-input border border-border text-foreground text-[12px] px-3 py-2 focus:outline-none focus:border-primary"
              style={{ borderRadius: 0 }}
              disabled={isPending}
            >
              <option value="rh">RH</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={isPending || !email.trim()}
              style={{ borderRadius: 0 }}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Enviando..." : "Enviar Convite"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              disabled={isPending}
              style={{ borderRadius: 0 }}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {users.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhum usuário.</div>
        )}
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground bg-muted">
                {user.role}
              </span>
              {!user.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-destructive/30 text-destructive bg-destructive/10">
                  Inativo
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
