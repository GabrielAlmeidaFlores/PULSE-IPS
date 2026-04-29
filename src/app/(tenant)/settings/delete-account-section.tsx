"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, Trash2, Loader2, CheckCircle2, LogOut } from "lucide-react"
import { requestAccountDeletionAction, confirmAccountDeletionAction } from "@/app/(tenant)/settings/actions"
import { logoutAction } from "@/app/(auth)/logout/actions"
import { env } from "@/env"

const GRACE_DAYS = 30

type DeletionStep = "idle" | "warning" | "code-sent" | "confirming" | "deleted"

export function DeleteAccountSection(): React.ReactElement {
  const [step, setStep] = useState<DeletionStep>("idle")
  const [code, setCode] = useState("")
  const [deletionDate, setDeletionDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoggingOut, startLogoutTransition] = useTransition()

  function handleOpenWarning(): void {
    setStep("warning")
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
        setDeletionDate(new Date(result.deletionScheduledAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }))
      }
      setStep("deleted")
    })
  }

  function handleCancel(): void {
    setStep("idle")
    setCode("")
  }

  function handleLogout(): void {
    startLogoutTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <>
      {step === "deleted" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border max-w-sm w-full mx-4" style={{ borderRadius: 0 }}>
            <div className="border-b border-border px-5 py-3 flex items-center gap-2 bg-status-warning-subtle">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-warning" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning">
                Exclusão agendada com sucesso
              </span>
            </div>
            <div className="px-5 py-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Sua solicitação foi registrada
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sua conta e todos os dados serão permanentemente excluídos em{" "}
                <strong className="text-foreground">{deletionDate ?? `${GRACE_DAYS} dias`}</strong>.
                Você ainda pode cancelar essa solicitação dentro desse prazo.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Para cancelar, entre em contato com o suporte em{" "}
                <a
                  href={`mailto:${env.NEXT_PUBLIC_EMAIL_SUPPORT}`}
                  className="text-primary hover:underline font-semibold"
                >
                  {env.NEXT_PUBLIC_EMAIL_SUPPORT}
                </a>
                .
              </p>
            </div>
            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
              >
                {isLoggingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                Compreendi e desejo sair do sistema
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-status-danger-border bg-card max-w-lg">
        <div className="border-b border-status-danger-border px-4 py-2.5 bg-status-danger-subtle">
          <span className="text-[11px] font-bold uppercase tracking-widest text-status-danger">
            Zona de Perigo
          </span>
        </div>

        <div className="px-4 py-4">
          {step === "idle" && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Excluir organização</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cancela a assinatura imediatamente e agenda a exclusão de todos os dados em 30 dias.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenWarning}
                className="shrink-0 text-xs font-semibold text-status-danger border border-status-danger-border px-3 py-1.5 hover:bg-status-danger-subtle transition-colors"
              >
                Excluir conta
              </button>
            </div>
          )}

          {step === "warning" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-status-danger-subtle flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-status-danger" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Esta ação não pode ser desfeita facilmente</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <span className="text-status-danger font-bold mt-0.5">·</span>
                      <span>A assinatura será <strong className="text-foreground">cancelada imediatamente</strong> — sem cobranças futuras</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-status-danger font-bold mt-0.5">·</span>
                      <span>Todos os dados serão <strong className="text-foreground">permanentemente deletados em 30 dias</strong>: colaboradores, pesquisas, respostas, relatos e documentos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-status-danger font-bold mt-0.5">·</span>
                      <span>Você tem <strong className="text-foreground">30 dias para cancelar</strong> a solicitação entrando em contato com o suporte</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-status-danger hover:bg-status-danger/90 px-3 py-1.5 transition-colors disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Continuar — enviar código de confirmação
                </button>
              </div>
            </div>
          )}

          {(step === "code-sent" || step === "confirming") && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Confirme com o código enviado por e-mail</p>
                <p className="text-xs text-muted-foreground">
                  Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 15 minutos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-32 border border-border bg-background px-3 py-1.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending || code.length !== 6}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-status-danger hover:bg-status-danger/90 px-3 py-1.5 transition-colors disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
