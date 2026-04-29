import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Trash2, MessageSquare, ShieldCheck, UserX, Clock, FileText, Scale, AlertTriangle, Mail } from "lucide-react"
import { Logo } from "@/libs/design-system/components/logo"
import { env } from "@/env"

const PRIVACY_EMAIL = env.NEXT_PUBLIC_EMAIL_PRIVACY

export const metadata: Metadata = {
  title: "Exclusão de Dados — Pulse IPS",
  description: "Saiba como solicitar a exclusão dos seus dados pessoais da plataforma Pulse IPS, seus direitos como titular e os prazos aplicáveis.",
}

function Section({ icon, iconBg, iconColor, title, children }: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="border border-border rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-md ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

function Bullet({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <li className="flex items-start gap-2">
      <span className="text-primary font-bold mt-0.5 shrink-0">·</span>
      <span>{children}</span>
    </li>
  )
}

function Step({ n, children }: { n: string; children: React.ReactNode }): React.ReactElement {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <span className="text-sm text-muted-foreground leading-relaxed">{children}</span>
    </li>
  )
}

function OptionBox({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="bg-muted/40 border border-border/60 rounded-md p-4">
      <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

export default function DataDeletionPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Exclusão de Dados Pessoais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seus direitos como titular de dados na plataforma Pulse IPS
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-8 ml-[52px]">Atualizado em abril de 2026</p>

        <div className="space-y-5">

          
          <Section
            icon={<FileText className="h-4 w-4" />}
            iconBg="bg-slate-100 dark:bg-slate-800"
            iconColor="text-slate-600 dark:text-slate-400"
            title="Responsável pelo tratamento dos dados"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              O tratamento dos seus dados pessoais é realizado pela:
            </p>
            <div className="bg-muted/40 border border-border/60 rounded-md p-4 text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Razão social:</strong> Pulse Tecnologia em Saúde Ocupacional Ltda.</p>
              <p><strong className="text-foreground">Nome fantasia:</strong> Pulse IPS</p>
              <p><strong className="text-foreground">E-mail do Encarregado (DPO):</strong>{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:underline font-medium">
                  {PRIVACY_EMAIL}
                </a>
              </p>
              <p><strong className="text-foreground">Prazo de resposta:</strong> até 15 dias corridos após o recebimento da solicitação</p>
            </div>
          </Section>

          
          <Section
            icon={<MessageSquare className="h-4 w-4" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            title="Por que o Pulse IPS acessa meus dados?"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              O Pulse IPS é contratado pela empresa onde você trabalha para monitorar saúde e bem-estar ocupacional.
              Para isso, armazenamos o número de telefone fornecido pelo seu empregador e enviamos pesquisas rápidas
              via WhatsApp ou SMS. Todas as respostas são{" "}
              <strong className="text-foreground">completamente anônimas</strong> — nenhuma resposta é
              vinculada ao seu nome, telefone ou qualquer identificação pessoal.
            </p>
          </Section>

          
          <Section
            icon={<ShieldCheck className="h-4 w-4" />}
            iconBg="bg-status-warning-subtle"
            iconColor="text-status-warning"
            title="Quais dados são armazenados?"
          >
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <Bullet>
                <strong className="text-foreground">Nome</strong> — fornecido pela sua empresa no cadastro
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Número de telefone</strong> — utilizado exclusivamente para envio de pesquisas via WhatsApp/SMS
              </Bullet>
              <Bullet>
                <strong className="text-foreground">E-mail</strong> — opcional, se fornecido pela empresa
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Registro de consentimento (TCLE)</strong> — hash do CPF e data/hora do aceite, armazenados para fins de comprovação legal trabalhista, conforme a LGPD
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Respostas às pesquisas</strong> — armazenadas de forma estritamente anônima, sem qualquer vínculo com seu nome, telefone ou CPF; apenas data (sem horário) e setor da empresa são registrados
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Registro de mensagens enviadas</strong> — data e status de entrega das mensagens, sem conteúdo de respostas
              </Bullet>
            </ul>
          </Section>

          
          <Section
            icon={<Scale className="h-4 w-4" />}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
            title="Seus direitos como titular (LGPD — Lei 13.709/2018)"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A Lei Geral de Proteção de Dados garante os seguintes direitos:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                { title: "Acesso", desc: "Saber quais dados seus estão armazenados" },
                { title: "Correção", desc: "Corrigir dados incompletos, inexatos ou desatualizados" },
                { title: "Exclusão", desc: "Solicitar a eliminação dos seus dados pessoais" },
                { title: "Portabilidade", desc: "Receber seus dados em formato legível" },
                { title: "Revogação do consentimento", desc: "Cancelar sua participação nas pesquisas a qualquer momento" },
                { title: "Oposição", desc: "Opor-se ao tratamento em caso de descumprimento da LGPD" },
                { title: "Informação", desc: "Ser informado sobre o uso dos seus dados e compartilhamentos" },
                { title: "Não discriminação", desc: "Não ser prejudicado por exercer qualquer desses direitos" },
              ].map((right) => (
                <div key={right.title} className="bg-muted/40 border border-border/60 rounded-md px-3 py-2.5">
                  <p className="font-semibold text-foreground text-xs mb-0.5">{right.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{right.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Para exercer qualquer desses direitos, entre em contato com o RH da sua empresa ou diretamente
              com nosso DPO em{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:underline font-medium">
                {PRIVACY_EMAIL}
              </a>.
            </p>
          </Section>

          
          <Section
            icon={<Clock className="h-4 w-4" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            title="Por quanto tempo seus dados são mantidos?"
          >
            <div className="overflow-hidden border border-border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-foreground text-xs">Tipo de dado</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-foreground text-xs">Prazo de retenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground text-xs">
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">Nome, telefone e e-mail</td>
                    <td className="px-4 py-2.5">Enquanto o cadastro estiver ativo na organização</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">Registro de consentimento (TCLE)</td>
                    <td className="px-4 py-2.5">5 anos após a data do registro (obrigação legal trabalhista)</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">Respostas às pesquisas (anônimas)</td>
                    <td className="px-4 py-2.5">Enquanto a organização estiver ativa; excluídas junto com a conta</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">Logs de mensagens enviadas</td>
                    <td className="px-4 py-2.5">12 meses após o envio</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">Dados após exclusão da organização</td>
                    <td className="px-4 py-2.5">30 dias de carência, depois exclusão permanente</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          
          <Section
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            title="O que acontece ao solicitar exclusão da organização?"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Quando o administrador da organização solicita a exclusão da conta pelo painel (Configurações → Zona de Perigo):
            </p>
            <ol className="space-y-3">
              <Step n="1">
                A <strong className="text-foreground">assinatura é cancelada imediatamente</strong> — nenhuma cobrança futura será realizada.
              </Step>
              <Step n="2">
                A organização entra em <strong className="text-foreground">período de carência de 30 dias</strong>. Durante esse prazo, é possível cancelar a solicitação via suporte em{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:underline">{PRIVACY_EMAIL}</a>.
              </Step>
              <Step n="3">
                Após os 30 dias, <strong className="text-foreground">todos os dados operacionais são permanentemente excluídos</strong>: colaboradores, pesquisas, respostas, relatos, documentos, alertas e registros de auditoria.
              </Step>
              <Step n="4">
                Os registros de consentimento (TCLE) com hash de CPF são mantidos pelo prazo legal de 5 anos, conforme exigido pela legislação trabalhista, e em seguida excluídos automaticamente.
              </Step>
            </ol>
            <div className="mt-4 bg-status-warning-subtle border border-status-warning-border rounded-md p-3">
              <p className="text-xs text-status-warning leading-relaxed">
                <strong>Atenção:</strong> A exclusão após o período de carência é <strong>irreversível</strong>. Os dados não poderão ser recuperados após a exclusão permanente. Certifique-se de exportar todos os relatórios necessários antes de solicitar a exclusão.
              </p>
            </div>
          </Section>

          
          <Section
            icon={<UserX className="h-4 w-4" />}
            iconBg="bg-status-danger-subtle"
            iconColor="text-status-danger"
            title="Como solicitar a exclusão dos meus dados?"
          >
            <div className="space-y-3">
              <OptionBox title="Opção 1 — Opt-out diretamente na pesquisa (colaboradores)">
                Em qualquer link de pesquisa que você receber, clique em{" "}
                <em>&ldquo;Não quero mais participar&rdquo;</em>. Você será removido das próximas pesquisas imediatamente.
                Seu registro ficará inativo e nenhuma nova mensagem será enviada.
              </OptionBox>

              <OptionBox title="Opção 2 — Contato com o setor de RH da sua empresa">
                Entre em contato com o departamento de Recursos Humanos da empresa em que você trabalha
                e solicite a remoção do seu cadastro. O RH pode inativar, pausar ou excluir seu registro individualmente,
                sem necessidade de encerrar a conta da organização.
              </OptionBox>

              <OptionBox title="Opção 3 — Painel do administrador (exclusão da organização)">
                O administrador pode solicitar a exclusão completa da conta em{" "}
                <strong className="text-foreground">Configurações → Zona de Perigo</strong>. A exclusão segue
                o processo com carência de 30 dias descrito acima.
              </OptionBox>

              <OptionBox title="Opção 4 — Contato direto com o Encarregado de Dados (DPO)">
                <span>
                  Envie um e-mail para{" "}
                  <a
                    href={`mailto:${PRIVACY_EMAIL}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {PRIVACY_EMAIL}
                  </a>{" "}
                  com o assunto <em>&ldquo;Solicitação de Exclusão de Dados — [nome da empresa]&rdquo;</em>, informando
                  seu nome, a empresa onde trabalha e o número de telefone cadastrado.
                  Processaremos sua solicitação em até <strong className="text-foreground">15 dias corridos</strong>.
                </span>
              </OptionBox>
            </div>
          </Section>

          
          <Section
            icon={<ShieldCheck className="h-4 w-4" />}
            iconBg="bg-status-success-subtle"
            iconColor="text-status-success"
            title="O que não é excluído mesmo após solicitação?"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Alguns dados são mantidos por obrigação legal e não podem ser excluídos a pedido individual:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <Bullet>
                <strong className="text-foreground">Respostas às pesquisas</strong> — são armazenadas de forma completamente anônima e não podem ser vinculadas a nenhum indivíduo. Por isso, tecnicamente não é possível identificar e excluir &ldquo;a resposta de uma pessoa específica&rdquo;.
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Hash de CPF do aceite do TCLE</strong> — mantido por 5 anos como evidência legal de consentimento, conforme legislação trabalhista brasileira. O CPF em texto puro jamais é armazenado.
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Registros de auditoria internos</strong> — mantidos por até 5 anos para fins de rastreabilidade e segurança, sem exposição a terceiros.
              </Bullet>
            </ul>
          </Section>

          
          <section className="border border-primary/20 bg-primary/5 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Fale com nosso Encarregado de Dados (DPO)</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Para qualquer dúvida sobre proteção de dados, exercício de direitos ou solicitações relacionadas à LGPD:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`mailto:${PRIVACY_EMAIL}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {PRIVACY_EMAIL}
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Prazo de resposta: até 15 dias corridos</p>
              </div>
            </div>
          </section>

          
          <section className="bg-muted/30 border border-border rounded-lg p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Para mais informações sobre como tratamos seus dados, consulte nossa{" "}
              <Link href="/privacy-policy" className="text-primary hover:underline font-medium">
                Política de Privacidade
              </Link>{" "}
              e o{" "}
              <Link href="/consent-terms" className="text-primary hover:underline font-medium">
                Termo de Consentimento (TCLE)
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pulse Tecnologia em Saúde Ocupacional Ltda. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
            <Link href="/platform-terms" className="hover:text-foreground transition-colors">Termos de Uso</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
