"use client"

import { useTransition } from "react"
import { AlertTriangle, Loader2, LogOut, X } from "lucide-react"
import { logoutAction } from "@/app/(auth)/logout/actions"
import { cancelOrganizationDeletionAction } from "@/app/(tenant)/settings/actions"
import { toast } from "sonner"


interface DeletionScheduledModalProps {
  deletionScheduledAt: string
  role: "admin" | "rh"
}

export function DeletionScheduledModal({ deletionScheduledAt, role }: DeletionScheduledModalProps): React.ReactElement {
  const [isCancelling, startCancelTransition] = useTransition()
  const [isLoggingOut, startLogoutTransition] = useTransition()

  const formattedDate = new Date(deletionScheduledAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  function handleCancelDeletion(): void {
    startCancelTransition(async () => {
      const result = await cancelOrganizationDeletionAction()
      if (result.error) {
        toast.error(result.error)
      }
    })
  }

  function handleLogout(): void {
    startLogoutTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border max-w-md w-full mx-4">
        <div className="border-b border-border px-5 py-3 flex items-center gap-2 bg-status-warning-subtle">
          <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning">
            Exclusão agendada
          </span>
        </div>

        <div className="px-5 py-5 space-y-3">
          {role === "admin" ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                Esta organização foi solicitada para exclusão
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Todos os dados serão permanentemente excluídos em{" "}
                <strong className="text-foreground">{formattedDate}</strong>. Você ainda pode cancelar essa solicitação.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Esta organização está programada para exclusão
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O administrador solicitou a exclusão desta organização. Os dados serão removidos em{" "}
                <strong className="text-foreground">{formattedDate}</strong>.
              </p>
            </>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 flex items-center gap-3">
          {role === "admin" && (
            <button
              type="button"
              onClick={handleCancelDeletion}
              disabled={isCancelling || isLoggingOut}
              className="flex flex-1 items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isCancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Cancelar a exclusão
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isCancelling || isLoggingOut}
            className="flex flex-1 items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-muted-foreground border border-border hover:bg-muted/50 transition-colors disabled:opacity-60"
          >
            {isLoggingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
            Sair do sistema
          </button>
        </div>
      </div>
    </div>
  )
}
