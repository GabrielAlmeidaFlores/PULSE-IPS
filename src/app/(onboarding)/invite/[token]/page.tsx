import Link from "next/link"
import { getInviteByToken } from "@/modules/auth/invite.service"
import { AcceptInviteForm } from "@/app/(onboarding)/invite/[token]/accept-invite-form"

interface Props {
  params: Promise<{ token: string }>
}

const GRID_BG = {
  backgroundImage: `repeating-linear-gradient(0deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px)`,
}

interface InviteErrorInfo {
  title: string
  description: string
  hint: string
}

function getInviteErrorInfo(
  invitation: { usedAt: Date | null; expiresAt: Date } | null,
): InviteErrorInfo {
  if (!invitation) {
    return {
      title: "Convite não encontrado",
      description: "Este link de convite não existe ou foi removido.",
      hint: "Peça ao administrador da organização que envie um novo convite para o seu e-mail.",
    }
  }
  if (invitation.usedAt) {
    return {
      title: "Convite já utilizado",
      description: "Este convite já foi aceito e não pode ser usado novamente.",
      hint: "Se você já definiu sua senha, acesse a plataforma normalmente pelo link abaixo.",
    }
  }
  return {
    title: "Convite expirado",
    description: "Este convite estava válido por 7 dias e o prazo se encerrou.",
    hint: "Peça ao administrador da organização que reenvie o convite.",
  }
}

export default async function InvitePage({ params }: Props): Promise<React.ReactElement> {
  const { token } = await params
  const invitation = await getInviteByToken(token)

  const isInvalid = !invitation || Boolean(invitation.usedAt) || invitation.expiresAt < new Date()

  if (isInvalid) {
    const errorInfo = getInviteErrorInfo(invitation ?? null)
    const showLoginLink = invitation?.usedAt !== null && invitation?.usedAt !== undefined

    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={GRID_BG} />
        <div className="relative border border-border bg-card max-w-sm w-full mx-4" style={{ borderRadius: 0 }}>
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">
              {errorInfo.title}
            </span>
          </div>
          <div className="px-5 py-5 space-y-3">
            <p className="text-sm text-foreground">{errorInfo.description}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{errorInfo.hint}</p>
          </div>
          <div className="border-t border-border px-5 py-3">
            {showLoginLink ? (
              <Link
                href="/login"
                className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
              >
                Ir para o login &rarr;
              </Link>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Precisa de ajuda?{" "}
                <a
                  href="mailto:suporte@pulseips.com.br"
                  className="text-primary hover:underline"
                >
                  suporte@pulseips.com.br
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={GRID_BG} />
      <div className="relative w-full max-w-md px-6 py-12">
        <AcceptInviteForm
          token={token}
          email={invitation.email}
          orgName={invitation.organization.name}
        />
      </div>
    </div>
  )
}
