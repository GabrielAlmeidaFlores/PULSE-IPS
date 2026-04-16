import { ResetPasswordForm } from "@/app/(auth)/reset-password/[token]/reset-password-form"

interface Props {
  params: Promise<{ token: string }>
}

export default async function ResetPasswordPage({ params }: Props): Promise<React.ReactElement> {
  const { token } = await params
  return <ResetPasswordForm token={token} />
}
