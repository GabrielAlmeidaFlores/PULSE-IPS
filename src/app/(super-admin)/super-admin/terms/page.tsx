import { getAllTermsVersions } from "@/modules/terms/terms.service"
import { listAllConsentTermVersions } from "@/modules/consent/consent.service"
import { TermsHub } from "@/app/(super-admin)/super-admin/terms/terms-hub"

export default async function TermsPage(): Promise<React.ReactElement> {
  const [platformVersions, consentVersions] = await Promise.all([
    getAllTermsVersions(),
    listAllConsentTermVersions(),
  ])

  return <TermsHub platformVersions={platformVersions} consentVersions={consentVersions} />
}
