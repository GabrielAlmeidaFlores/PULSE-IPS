"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { inviteUserAction, resendOrgInviteAction, cancelOrgInviteAction } from "@/app/(tenant)/settings/actions"
import type { SafeOrgUser, PendingOrgInvite } from "@/modules/auth/auth.types"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  rh: "RH",
}

interface Props {
  users: SafeOrgUser[]
  pendingInvites: PendingOrgInvite[]
}

export function TeamManagement({ users, pendingInvites }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [isResending, startResend] = useTransition()
  const [isCancelling, startCancel] = useTransition()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "rh">("rh")

  function handleClose(): void {
    if (isPending) return
    setOpen(false)
    setEmail("")
    setRole("rh")
  }

  function handleInvite(): void {
    startTransition(async () => {
      const result = await inviteUserAction({ email, role })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Convite enviado para ${email}.`)
      handleClose()
    })
  }

  function handleResend(inviteId: string, inviteEmail: string): void {
    startResend(async () => {
      const result = await resendOrgInviteAction(inviteId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Convite reenviado para ${inviteEmail}.`)
    })
  }

  function handleCancel(inviteId: string, inviteEmail: string): void {
    startCancel(async () => {
      const result = await cancelOrgInviteAction(inviteId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Convite de ${inviteEmail} cancelado.`)
    })
  }

  return (
    <div className="space-y-3 max-w-lg">
      <div className="border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest">Equipe</span>
          <button
            onClick={() => setOpen(true)}
            style={{ borderRadius: 0 }}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            Convidar
          </button>
        </div>

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
                  {ROLE_LABELS[user.role] ?? user.role}
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

      {pendingInvites.length > 0 && (
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest">Convites Pendentes</span>
          </div>
          <div className="divide-y divide-border">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expira em {new Date(invite.expiresAt).toLocaleDateString("pt-BR")} · {ROLE_LABELS[invite.role] ?? invite.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResend(invite.id, invite.email)}
                    disabled={isResending || isCancelling}
                    style={{ borderRadius: 0 }}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reenviar
                  </button>
                  <button
                    onClick={() => handleCancel(invite.id, invite.email)}
                    disabled={isResending || isCancelling}
                    style={{ borderRadius: 0 }}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Convidar membro</DialogTitle>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Email</Label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) handleInvite() }}
                  placeholder="email@empresa.com"
                  className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  style={{ borderRadius: 0 }}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Perfil</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "rh")}
                  className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  style={{ borderRadius: 0 }}
                  disabled={isPending}
                >
                  <option value="rh">RH</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <DialogClose
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
                disabled={isPending}
              >
                Cancelar
              </DialogClose>
              <button
                onClick={handleInvite}
                disabled={isPending || !email.trim()}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? "Enviando..." : "Enviar Convite"}
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
