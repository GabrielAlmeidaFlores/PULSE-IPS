import { getAllTermsVersions } from "@/modules/terms/terms.service"
import { listAllConsentTermVersions } from "@/modules/consent/consent.service"
import { getAllPrivacyPolicyVersions } from "@/modules/privacy-policy/privacy-policy.service"
import { TermsHub } from "@/app/(super-admin)/super-admin/terms/terms-hub"

export default async function TermsPage(): Promise<React.ReactElement> {
  const [platformVersions, consentVersions, privacyPolicyVersions] = await Promise.all([
    getAllTermsVersions(),
    listAllConsentTermVersions(),
    getAllPrivacyPolicyVersions(),
  ])

  return (
    <TermsHub
      platformVersions={platformVersions}
      consentVersions={consentVersions}
      privacyPolicyVersions={privacyPolicyVersions}
    />
  )
}
