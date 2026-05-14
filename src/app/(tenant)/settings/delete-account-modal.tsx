"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, Trash2, Loader2, CheckCircle2, LogOut } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OtpInput } from "@/components/ui/otp-input"
import { requestAccountDeletionAction, confirmAccountDeletionAction } from "@/app/(tenant)/settings/actions"
import { logoutAction } from "@/app/(auth)/logout/actions"
import { env } from "@/env"

const GRACE_DAYS = 30

type DeletionStep = "warning" | "code-sent" | "confirming" | "deleted"

interface DeleteAccountModalProps {
  open: boolean
  onClose: () => void
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps): React.ReactElement {
  const [step, setStep] = useState<DeletionStep>("warning")
  const [code, setCode] = useState("")
  const [deletionDate, setDeletionDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoggingOut, startLogoutTransition] = useTransition()

  function handleClose(): void {
    if (isPending) return
    onClose()
  }

  function handleOpenChange(v: boolean): void {
    if (!v) handleClose()
  }

  function handleSendCode(): void {
    startTransition(async () => {
      const result = await requestAccountDeletionAction()
      if (result.error) {
        toast.error(result.error)
        return
      }
      setStep("code-sent")
      toast.success("Código enviado para o seu e-mail.")
    })
  }

  function handleConfirm(): void {
    startTransition(async () => {
      setStep("confirming")
      const result = await confirmAccountDeletionAction({ code })
      if (result.error) {
        toast.error(result.error)
        setStep("code-sent")
        return
      }
      if (result.deletionScheduledAt !== undefined) {
        setDeletionDate(
          new Date(result.deletionScheduledAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
        )
      }
      setStep("deleted")
    })
  }

  function handleLogout(): void {
    startLogoutTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" style={{ borderRadius: 0 }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest text-status-danger">
            Excluir organização
          </DialogTitle>
        </DialogHeader>

        {step === "warning" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-status-danger-subtle flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-status-danger" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  Esta ação não pode ser desfeita facilmente
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="text-status-danger font-bold mt-0.5">·</span>
                    <span>
                      A assinatura será{" "}
                      <strong className="text-foreground">cancelada imediatamente</strong> — sem
                      cobranças futuras
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-status-danger font-bold mt-0.5">·</span>
                    <span>
                      Todos os dados serão{" "}
                      <strong className="text-foreground">
                        permanentemente deletados em {GRACE_DAYS} dias
                      </strong>
                      : colaboradores, pesquisas, respostas, relatos e documentos
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-status-danger font-bold mt-0.5">·</span>
                    <span>
                      Você tem{" "}
                      <strong className="text-foreground">{GRACE_DAYS} dias para cancelar</strong>{" "}
                      entrando em contato com o suporte
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleClose}
                style={{ borderRadius: 0 }}
                className="shrink-0 whitespace-nowrap text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isPending}
                style={{ borderRadius: 0 }}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold text-white bg-status-danger hover:bg-status-danger/90 px-3 py-1.5 transition-colors disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="h-3 w-3 shrink-0" />
                )}
                Enviar código de confirmação por e-mail
              </button>
            </div>
          </div>
        )}

        {(step === "code-sent" || step === "confirming") && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Confirme com o código enviado por e-mail
              </p>
              <p className="text-xs text-muted-foreground">
                Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 15 minutos.
              </p>
            </div>
            <OtpInput value={code} onChange={setCode} disabled={isPending} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending || code.replace(/\D/g, "").length !== 6}
                style={{ borderRadius: 0 }}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold text-white bg-status-danger hover:bg-status-danger/90 px-3 py-1.5 transition-colors disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="h-3 w-3 shrink-0" />
                )}
                Confirmar exclusão
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                style={{ borderRadius: 0 }}
                className="shrink-0 whitespace-nowrap text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === "deleted" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-status-warning-subtle flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-status-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Solicitação registrada
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sua conta e todos os dados serão permanentemente excluídos em{" "}
                  <strong className="text-foreground">{deletionDate ?? `${GRACE_DAYS} dias`}</strong>
                  .
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Para cancelar, entre em contato em{" "}
                  <a
                    href={`mailto:${env.NEXT_PUBLIC_EMAIL_SUPPORT}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    {env.NEXT_PUBLIC_EMAIL_SUPPORT}
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                style={{ borderRadius: 0 }}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <LogOut className="h-3 w-3 shrink-0" />
                )}
                Compreendi e desejo sair do sistema
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
