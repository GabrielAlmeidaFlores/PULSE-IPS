import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getReports } from "@/modules/anonymous-reports/anonymous-report.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { ReportControls } from "@/app/(tenant)/reports/report-controls"
import { CopyReportLink } from "@/app/(tenant)/reports/copy-report-link"
import { PageHelp } from "@/components/page-help"

export default async function ReportsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [reports, org] = await Promise.all([
    getReports(session.tenantId),
    getOrganization(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Relatos Anônimos</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Canal de relato anônimo</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Espaço seguro para colaboradores relatarem situações de assédio, conflito, sobrecarga ou qualquer desconforto no ambiente de trabalho. <strong>Totalmente anônimo</strong> — nenhuma informação do remetente é coletada ou armazenada.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Como funciona</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>① Compartilhe o <strong>link público</strong> (botão &quot;Copiar link&quot;) com seus colaboradores via e-mail, grupos ou murais</li>
                    <li>② O colaborador acessa, escolhe uma categoria e descreve a situação</li>
                    <li>③ O relato aparece aqui para o RH tratar, sem qualquer identificação</li>
                    <li>④ Marque como <strong>Em análise → Resolvido</strong> à medida que age</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Relatos de crise</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Quando o sistema detecta palavras-chave de saúde mental grave (ex: &quot;quero desaparecer&quot;), o relato é marcado automaticamente como <strong>crise</strong> e gera um alerta de alta severidade. O formulário público exibe o número do CVV (188) nesse caso.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Importância legal</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Manter um canal de escuta permanente e documentar o tratamento dos relatos é uma boa prática exigida indiretamente pela <strong>NR-1</strong> e pode ser apresentado como evidência do comprometimento da empresa com a saúde ocupacional.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{reports.length} total</p>
        </div>
        {org && <CopyReportLink orgSlug={org.slug} />}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ReportControls reports={reports} />
      </div>
    </div>
  )
}
