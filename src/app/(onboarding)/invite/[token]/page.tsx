import { getInviteByToken } from "@/modules/auth/invite.service"
import { AcceptInviteForm } from "@/app/(onboarding)/invite/[token]/accept-invite-form"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props): Promise<React.ReactElement> {
  const { token } = await params
  const invitation = await getInviteByToken(token)

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px)`,
          }}
        />
        <div className="relative border border-border bg-card p-6 max-w-sm w-full mx-4" style={{ borderRadius: 0 }}>
          <div className="border-l-4 border-l-destructive pl-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Convite inválido</p>
            <p className="text-[12px] text-muted-foreground">
              Este convite é inválido, expirou ou já foi utilizado.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px)`,
        }}
      />
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
