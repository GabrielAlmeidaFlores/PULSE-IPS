"use client"

import { useState } from "react"
import { FileText, Shield, Lock } from "lucide-react"
import { TermsVersionList } from "@/app/(super-admin)/super-admin/terms/terms-version-list"
import { NewTermsVersionForm } from "@/app/(super-admin)/super-admin/terms/new-terms-version-form"
import { ConsentTermVersionList } from "@/app/(super-admin)/super-admin/consent-terms/consent-term-version-list"
import { NewConsentTermForm } from "@/app/(super-admin)/super-admin/consent-terms/new-consent-term-form"
import { PrivacyPolicyVersionList } from "@/app/(super-admin)/super-admin/terms/privacy-policy-version-list"
import { NewPrivacyPolicyVersionForm } from "@/app/(super-admin)/super-admin/terms/new-privacy-policy-version-form"

interface PlatformTermsVersion {
  id: string
  version: string
  title: string
  content: string
  isActive: boolean
  effectiveAt: Date
  createdAt: Date
}

interface ConsentTermVersion {
  id: string
  version: string
  content: string
  contentHash: string
  isActive: boolean
  createdAt: Date
}

interface PrivacyPolicyVersion {
  id: string
  version: string
  title: string
  content: string
  isActive: boolean
  effectiveAt: Date
  createdAt: Date
}

interface Props {
  platformVersions: PlatformTermsVersion[]
  consentVersions: ConsentTermVersion[]
  privacyPolicyVersions: PrivacyPolicyVersion[]
}

type TermsType = "platform" | "tcle" | "privacy"

const TABS: { id: TermsType; label: string; icon: React.ReactElement; description: string }[] = [
  {
    id: "platform",
    label: "Termos da Plataforma",
    icon: <FileText className="h-4 w-4" />,
    description: "Aceitos pelos admins e gestores de RH ao acessar o Pulse",
  },
  {
    id: "tcle",
    label: "TCLE dos Colaboradores",
    icon: <Shield className="h-4 w-4" />,
    description: "Aceitos pelos colaboradores antes de responder pesquisas",
  },
  {
    id: "privacy",
    label: "Política de Privacidade",
    icon: <Lock className="h-4 w-4" />,
    description: "Exibida publicamente na plataforma",
  },
]

export function TermsHub({
  platformVersions,
  consentVersions,
  privacyPolicyVersions,
}: Props): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TermsType>("platform")

  const activePlatform = platformVersions.find((v) => v.isActive)
  const activeConsent = consentVersions.find((v) => v.isActive)
  const activePrivacy = privacyPolicyVersions.find((v) => v.isActive)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-card shrink-0">
        <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Documentos Legais</h1>
        <p className="text-[11px] text-muted-foreground">Gerencie os termos da plataforma, o TCLE dos colaboradores e a política de privacidade</p>
      </div>

      <div className="flex border-b border-border bg-card shrink-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-bold tracking-widest uppercase transition-colors border-b-2 ${
                isActive
                  ? "border-b-primary text-primary bg-primary/5"
                  : "border-b-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              style={{ borderRadius: 0 }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "platform" && activePlatform && (
                <span className="text-[9px] font-bold bg-status-success-subtle text-status-success border border-status-success-border px-1.5 py-0.5 tracking-wider">
                  v{activePlatform.version}
                </span>
              )}
              {tab.id === "tcle" && activeConsent && (
                <span className="text-[9px] font-bold bg-status-success-subtle text-status-success border border-status-success-border px-1.5 py-0.5 tracking-wider">
                  v{activeConsent.version}
                </span>
              )}
              {tab.id === "privacy" && activePrivacy && (
                <span className="text-[9px] font-bold bg-status-success-subtle text-status-success border border-status-success-border px-1.5 py-0.5 tracking-wider">
                  v{activePrivacy.version}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "platform" && (
          <>
            <div className="flex items-start gap-2 p-3 mb-6 bg-status-warning-subtle border border-status-warning-border" style={{ borderRadius: 0 }}>
              <p className="text-[11px] text-status-warning">
                <strong>Atenção:</strong> ao publicar uma nova versão, todos os admins e gestores de RH de todas as
                organizações precisarão aceitar os novos termos antes de continuar acessando a plataforma.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
                  Histórico de versões · {platformVersions.length} publicada(s)
                </h2>
                <TermsVersionList versions={platformVersions} />
              </div>
              <NewTermsVersionForm {...(activePlatform ? { initialContent: activePlatform.content } : {})} />
            </div>
          </>
        )}

        {activeTab === "tcle" && (
          <>
            <div className="flex items-start gap-2 p-3 mb-6 bg-status-warning-subtle border border-status-warning-border" style={{ borderRadius: 0 }}>
              <p className="text-[11px] text-status-warning">
                <strong>Atenção:</strong> ao publicar uma nova versão, todos os colaboradores de todas as organizações
                precisarão aceitar o novo TCLE antes de responder qualquer pesquisa. Versões anteriores ficam inativas
                e não podem ser editadas.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
                  Histórico de versões · {consentVersions.length} publicada(s)
                </h2>
                <ConsentTermVersionList versions={consentVersions} />
              </div>
              <NewConsentTermForm {...(activeConsent ? { initialContent: activeConsent.content } : {})} />
            </div>
          </>
        )}

        {activeTab === "privacy" && (
          <>
            <div className="flex items-start gap-2 p-3 mb-6 bg-status-info-subtle border border-status-info-border" style={{ borderRadius: 0 }}>
              <p className="text-[11px] text-status-info">
                <strong>Informação:</strong> a versão ativa da política de privacidade é exibida publicamente em{" "}
                <code className="font-mono">/privacy-policy</code>. Ao publicar uma nova versão, a anterior fica inativa automaticamente.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
                  Histórico de versões · {privacyPolicyVersions.length} publicada(s)
                </h2>
                <PrivacyPolicyVersionList versions={privacyPolicyVersions} />
              </div>
              <NewPrivacyPolicyVersionForm
                {...(activePrivacy ? { initialContent: activePrivacy.content } : {})}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
