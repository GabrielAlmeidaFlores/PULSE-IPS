import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getPendingTermsForUser } from "@/modules/terms/terms.service"
import { AcceptTermsForm } from "@/app/(auth)/accept-terms/accept-terms-form"

export default async function AcceptTermsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const pending = await getPendingTermsForUser(session.userId)
  if (!pending) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AcceptTermsForm
        termsVersionId={pending.id}
        title={pending.title}
        version={pending.version}
        content={pending.content}
      />
    </div>
  )
}
