"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { requestAccountDeletionAction, confirmAccountDeletionAction } from "@/app/(tenant)/settings/actions"

type DeletionStep = "idle" | "warning" | "code-sent" | "confirming"

export function DeleteAccountSection(): React.ReactElement {
  const router = useRouter()
  const [step, setStep] = useState<DeletionStep>("idle")
  const [code, setCode] = useState("")
  const [isPending, startTransition] = useTransition()

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
      router.push("/")
    })
  }

  function handleCancel(): void {
    setStep("idle")
    setCode("")
  }

  return (
    <div className="border border-red-200 dark:border-red-900/50 bg-card max-w-lg">
      <div className="border-b border-red-200 dark:border-red-900/50 px-4 py-2.5 bg-red-50 dark:bg-red-950/30">
        <span className="text-[11px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
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
              className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              Excluir conta
            </button>
          </div>
        )}

        {step === "warning" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Esta ação não pode ser desfeita facilmente</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-500 font-bold mt-0.5">·</span>
                    <span>A assinatura será <strong className="text-foreground">cancelada imediatamente</strong> — sem cobranças futuras</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-500 font-bold mt-0.5">·</span>
                    <span>Todos os dados serão <strong className="text-foreground">permanentemente deletados em 30 dias</strong>: colaboradores, pesquisas, respostas, relatos e documentos</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-500 font-bold mt-0.5">·</span>
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
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 transition-colors disabled:opacity-60"
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
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 transition-colors disabled:opacity-60"
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
  )
}
