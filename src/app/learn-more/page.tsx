import Link from "next/link"
import {
  Shield,
  Users,
  ClipboardList,
  Bell,
  FileText,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Zap,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  Globe,
  Smile,
  TrendingUp,
  X,
} from "lucide-react"
import { Logo } from "@/libs/design-system/components/logo"
import { AnimateIn } from "@/components/animate-in"

function whatsappUrl(message: string): string {
  return `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`
}

export const metadata = {
  title: "Como o Pulse funciona — Saiba mais",
  description:
    "Entenda como o Pulse mantém sua empresa em dia com a NR-1, protege a privacidade dos colaboradores e elimina o trabalho manual do RH.",
}

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-4">
      {children}
    </div>
  )
}

type FlowActor = "voce" | "pulse" | "colaborador"

function FlowCard({
  actor,
  icon,
  title,
  desc,
  isLast = false,
}: {
  actor: FlowActor
  icon: React.ReactElement
  title: string
  desc: string
  isLast?: boolean
}): React.ReactElement {
  const actorConfig: Record<FlowActor, { label: string; bg: string; border: string; badge: string; badgeText: string }> = {
    voce: {
      label: "VOCÊ",
      bg: "bg-white",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      badgeText: "Sua ação",
    },
    pulse: {
      label: "PULSE",
      bg: "bg-primary/5",
      border: "border-primary/30",
      badge: "bg-primary/10 text-primary",
      badgeText: "Automático",
    },
    colaborador: {
      label: "COLABORADOR",
      bg: "bg-white",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
      badgeText: "Colaborador",
    },
  }

  const c = actorConfig[actor]

  return (
    <div className="flex flex-col items-center">
      <div className={`w-full rounded-2xl border-2 ${c.border} ${c.bg} p-5 shadow-sm`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{c.badgeText}</span>
            </div>
            <div className="font-bold text-sm text-foreground mb-1">{title}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center my-1">
          <div className="w-0.5 h-5 bg-border" />
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
        </div>
      )}
    </div>
  )
}

export default function LearnMorePage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-white text-foreground">

      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="sm" /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#problema" className="hover:text-foreground transition-colors">O problema</a>
            <a href="#solucao" className="hover:text-foreground transition-colors">A solução</a>
            <a href="#fluxo" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#privacidade" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#para-quem" className="hover:text-foreground transition-colors">Para quem é</a>
            <a href="#faq" className="hover:text-foreground transition-colors">Dúvidas</a>
          </nav>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_oklch(0.50_0.195_265/0.28)]"
          >
            Acessar plataforma
          </Link>
        </div>
      </header>


      <section
        className="relative overflow-hidden pt-24 pb-20 border-b border-border"
        style={{ background: "linear-gradient(160deg, oklch(0.97 0.012 265) 0%, oklch(0.975 0.004 258) 60%, oklch(0.97 0.010 240) 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.50 0.195 265) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.50 0.195 265 / 0.07) 0%, transparent 70%)", animation: "lp-float 9s ease-in-out infinite" }}
        />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 mb-6" style={{ animation: "lp-fade-in 0.5s ease-out both" }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            Nova obrigação legal a partir de maio de 2026
          </div>
          <h1
            className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6"
            style={{
              background: "linear-gradient(135deg, oklch(0.18 0.022 258), oklch(0.50 0.195 265))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "lp-fade-in-up 0.7s 0.1s ease-out both",
            }}
          >
            Sua empresa em dia com a NR-1.<br />Sem dor de cabeça.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed" style={{ animation: "lp-fade-in-up 0.7s 0.22s ease-out both" }}>
            O Pulse cuida de tudo que a lei exige — coleta de dados, consentimento dos colaboradores,
            alertas automáticos e relatórios prontos para auditoria. Você foca na sua empresa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ animation: "lp-fade-in-up 0.7s 0.34s ease-out both" }}>
            <Link
              href="/#planos"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-primary text-white font-semibold text-base transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_oklch(0.50_0.195_265/0.30)]"
            >
              Ver planos e preços
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#fluxo"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg border-2 border-border bg-white font-semibold text-base text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              Ver como funciona
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>


      <section id="problema" className="py-24 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <AnimateIn animation="fade-in-up">
              <div>
                <SectionLabel>✦ O cenário atual</SectionLabel>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                  Gerenciar saúde ocupacional hoje é um pesadelo
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  A maioria das empresas ainda tenta cumprir a NR-1 com planilhas espalhadas, e-mails manuais
                  e documentos soltos. O resultado é sempre o mesmo: horas perdidas, prazos esquecidos e
                  nenhuma garantia de que está tudo correto se vier uma fiscalização.
                </p>
                <div className="space-y-3">
                  {[
                    "Planilhas desatualizadas que ninguém sabe onde estão",
                    "Nenhuma forma de provar que os colaboradores deram consentimento",
                    "Relatório do PGR feito na correria, sem dados confiáveis",
                    "RH gastando horas em tarefas que poderiam ser automáticas",
                    "Risco real de multa se vier uma auditoria",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-foreground">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-3 h-3 text-red-500" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
            <div className="space-y-4">
              {[
                {
                  border: "border-red-100",
                  bg: "linear-gradient(135deg, oklch(0.98 0.01 25) 0%, oklch(0.97 0.005 20) 100%)",
                  label: "Sem o Pulse",
                  labelColor: "text-red-700",
                  title: "Horas por mês",
                  desc: "gastas em tarefas manuais que deveriam ser automáticas",
                },
                {
                  border: "border-amber-100",
                  bg: "linear-gradient(135deg, oklch(0.98 0.01 80) 0%, oklch(0.97 0.005 75) 100%)",
                  label: "Risco de auditoria",
                  labelColor: "text-amber-700",
                  title: "Sem documentação",
                  desc: "sua empresa não consegue provar que está cumprindo a lei",
                },
                {
                  border: "border-primary/20",
                  bg: "linear-gradient(135deg, oklch(0.97 0.012 265) 0%, oklch(0.975 0.004 258) 100%)",
                  label: "Com o Pulse",
                  labelColor: "text-primary",
                  title: "Tudo automatizado",
                  desc: "relatórios, alertas e consentimentos funcionando sozinhos",
                },
              ].map((card, i) => (
                <AnimateIn key={card.title} delay={i * 90} animation="fade-in-up">
                  <div className={`rounded-2xl p-6 border ${card.border}`} style={{ background: card.bg }}>
                    <div className={`text-sm font-bold ${card.labelColor} mb-2`}>{card.label}</div>
                    <div className="text-2xl font-extrabold text-foreground mb-1">{card.title}</div>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section id="solucao" className="py-24 border-b border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <SectionLabel>✦ A solução</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Tudo que a NR-1 exige, em um único lugar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O Pulse reúne todas as ferramentas que sua empresa precisa para estar em conformidade —
              e ainda avisa você quando é preciso agir.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Clock className="w-5 h-5" />,
                title: "Envio sempre no momento certo",
                desc: "Você define os dias da semana e o horário de expediente de cada equipe. O Pulse só envia pesquisas quando o colaborador está trabalhando — nunca no fim de semana ou fora do horário, a não ser que você queira.",
                benefit: "Respeito ao colaborador",
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: "Sua equipe organizada",
                desc: "Cadastre seus colaboradores por setor em minutos — ou importe uma planilha do Excel de uma vez. O Pulse organiza tudo automaticamente.",
                benefit: "Chega de planilha bagunçada",
              },
              {
                icon: <UserCheck className="w-5 h-5" />,
                title: "Consentimento no piloto automático",
                desc: "Cada colaborador recebe no WhatsApp um convite para aceitar os termos de participação. O aceite é registrado automaticamente, sem você precisar fazer nada.",
                benefit: "Prova legal de consentimento",
              },
              {
                icon: <ClipboardList className="w-5 h-5" />,
                title: "Pesquisas que se enviam sozinhas",
                desc: "Configure uma vez e esqueça. O Pulse envia as pesquisas de saúde para os colaboradores certos, na frequência certa, no horário certo.",
                benefit: "Zero trabalho manual",
              },
              {
                icon: <BarChart3 className="w-5 h-5" />,
                title: "Painel com tudo que importa",
                desc: "Veja em tempo real como está cada setor da sua empresa — taxa de participação, pontuação de bem-estar e evolução ao longo do tempo.",
                benefit: "Decisões com base em dados",
              },
              {
                icon: <Bell className="w-5 h-5" />,
                title: "Alertas antes que vire problema",
                desc: "O sistema monitora as respostas e te avisa quando algum setor precisa de atenção. Você age antes que uma situação pequena se torne um problema grande.",
                benefit: "Gestão proativa, não reativa",
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: "Registro de todas as ações",
                desc: "Cada medida tomada pelo RH fica documentada com data, responsável e resultado. Se vier uma fiscalização, você mostra tudo com poucos cliques.",
                benefit: "Auditoria sem surpresa",
              },
              {
                icon: <MessageSquare className="w-5 h-5" />,
                title: "Canal aberto para sua equipe",
                desc: "Colaboradores podem relatar situações difíceis de forma completamente anônima. Você sabe o que está acontecendo sem expor ninguém.",
                benefit: "Ambiente mais saudável",
              },
              {
                icon: <FileText className="w-5 h-5" />,
                title: "Relatório pronto com um clique",
                desc: "Precisa apresentar o relatório obrigatório? O Pulse gera o documento completo em segundos, com todos os dados do período organizados.",
                benefit: "Nunca mais corre na última hora",
              },
              {
                icon: <TrendingUp className="w-5 h-5" />,
                title: "Sua empresa sempre protegida",
                desc: "Documentação em dia, consentimentos registrados, ações documentadas. Sua empresa pode passar por uma fiscalização a qualquer momento sem preocupação.",
                benefit: "Tranquilidade para o gestor",
              },
            ].map((item, i) => (
              <AnimateIn key={item.title} delay={i * 60}>
                <div className="rounded-xl border border-border bg-white p-6 hover:border-primary/30 hover:shadow-[0_4px_20px_oklch(0.18_0.022_258/0.06)] transition-all group h-full">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {item.icon}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold mb-3">
                    <CheckCircle2 className="w-3 h-3" />
                    {item.benefit}
                  </div>
                  <h3 className="font-bold text-base mb-2 text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>


      <section id="fluxo" className="py-24 border-b border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <SectionLabel>✦ Do início ao relatório</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Veja como tudo acontece
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Do cadastro do primeiro colaborador até o relatório pronto para auditoria.
              Veja exatamente o que você faz e o que o Pulse faz por você.
            </p>
          </div>

    
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {[
              { color: "bg-blue-100 border-blue-200 text-blue-700", label: "Você faz" },
              { color: "bg-primary/10 border-primary/30 text-primary", label: "Pulse faz automaticamente" },
              { color: "bg-green-100 border-green-200 text-green-700", label: "Colaborador faz" },
            ].map((item) => (
              <div key={item.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${item.color}`}>
                <div className={`w-2 h-2 rounded-full ${item.color.split(" ")[0]}`} />
                {item.label}
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto">
            {([
              { actor: "voce", icon: <Users className="w-5 h-5" />, title: "Você cadastra sua equipe", desc: "Registra os colaboradores por setor — um a um ou importando uma planilha Excel. Leva minutos." },
              { actor: "pulse", icon: <MessageSquare className="w-5 h-5" />, title: "Pulse envia o convite pelo WhatsApp", desc: "Cada colaborador recebe automaticamente uma mensagem com o link para aceitar os termos de participação." },
              { actor: "colaborador", icon: <UserCheck className="w-5 h-5" />, title: "Colaborador aceita pelo celular", desc: "Em poucos cliques, no próprio celular. Sem papel, sem burocracia. O aceite fica registrado automaticamente." },
              { actor: "voce", icon: <ClipboardList className="w-5 h-5" />, title: "Você configura a pesquisa uma vez", desc: "Define as perguntas e com que frequência enviar — semanal, quinzenal, mensal. Feito isso, não precisa mais tocar." },
              { actor: "voce", icon: <Clock className="w-5 h-5" />, title: "Você define o expediente de cada equipe", desc: "Configura os dias da semana e o horário de trabalho de cada setor (ex: segunda a sexta, das 9h às 18h). Equipes com turnos diferentes, finais de semana ou horários especiais têm suas próprias configurações." },
              { actor: "pulse", icon: <Zap className="w-5 h-5" />, title: "Pulse dispara as pesquisas automaticamente", desc: "Só envia dentro do horário de expediente configurado — nunca madrugada, nunca fora do turno. O colaborador recebe a mensagem quando está trabalhando e pode responder na hora." },
              { actor: "colaborador", icon: <EyeOff className="w-5 h-5" />, title: "Colaborador responde — com total anonimato", desc: "Sem login, sem identificação. Só as respostas. Ninguém na empresa sabe quem disse o quê." },
              { actor: "pulse", icon: <BarChart3 className="w-5 h-5" />, title: "Pulse analisa e atualiza o painel", desc: "Os indicadores de cada setor são calculados automaticamente. Você vê tudo no painel em tempo real." },
              { actor: "pulse", icon: <Bell className="w-5 h-5" />, title: "Pulse avisa quando há algo a resolver", desc: "Se algum setor tiver queda nos resultados ou baixa participação, você recebe um alerta para agir." },
              { actor: "voce", icon: <Shield className="w-5 h-5" />, title: "Você registra a ação que tomou", desc: "Uma conversa com o gestor, um treinamento, uma mudança de processo. Registra no sistema com responsável e prazo." },
              { actor: "pulse", icon: <FileText className="w-5 h-5" />, title: "Pulse documenta tudo permanentemente", desc: "Cada ação registrada, cada consentimento, cada resposta. O histórico é imutável — pronto para qualquer auditoria." },
              { actor: "voce", icon: <CheckCircle2 className="w-5 h-5" />, title: "Você gera o relatório com um clique", desc: "Quando precisar, abre a plataforma, seleciona o período e clica em gerar. O documento está pronto em segundos.", isLast: true },
            ] as { actor: string; icon: React.ReactElement; title: string; desc: string; isLast?: boolean }[]).map((card, i) => (
              <AnimateIn key={card.title} delay={i * 50} animation="fade-in-up">
                <FlowCard
                  actor={card.actor}
                  icon={card.icon}
                  title={card.title}
                  desc={card.desc}
                  isLast={card.isLast}
                />
              </AnimateIn>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
            <div className="text-2xl font-extrabold text-foreground mb-2">É isso. Sem mistério.</div>
            <p className="text-muted-foreground max-w-lg mx-auto">
              O que parece complicado se torna simples porque o Pulse cuida de quase tudo automaticamente.
              Você só age quando realmente precisa.
            </p>
          </div>

    
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-lg text-amber-900 mb-2">Por que enviar só durante o expediente?</div>
                <p className="text-sm text-amber-800 leading-relaxed mb-4">
                  A NR-1 exige que a empresa monitore os riscos psicossociais <strong>no contexto do trabalho</strong>.
                  Isso significa que as pesquisas precisam ser respondidas enquanto o colaborador está no ambiente de trabalho —
                  não às 22h em casa, não no fim de semana descansando. Enviar fora do horário pode comprometer a validade
                  jurídica das respostas e ainda invadir o tempo de descanso, o que é justamente o oposto do que a lei busca proteger.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    {
                      title: "Validade legal",
                      desc: "Respostas coletadas durante o expediente têm mais peso jurídico como evidência de que o monitoramento foi feito no contexto laboral.",
                    },
                    {
                      title: "Respeito ao descanso",
                      desc: "A LGPD e a CLT protegem o direito ao descanso. Enviar mensagens fora do horário pode ser interpretado como assédio ou invasão de privacidade.",
                    },
                    {
                      title: "Taxas de resposta maiores",
                      desc: "Colaboradores que recebem no horário certo respondem mais — e com mais atenção. Isso melhora a qualidade dos dados para o RH.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl bg-white border border-amber-100 p-4">
                      <div className="font-bold text-sm text-amber-900 mb-1">{item.title}</div>
                      <p className="text-xs text-amber-700 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="py-16 border-b border-border bg-primary/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
            Pronto para automatizar o compliance da sua empresa?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Configure o Pulse em menos de 30 minutos e tenha sua empresa em conformidade com a NR-1 antes de maio de 2026.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#planos"
              className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-lg bg-primary text-white font-semibold text-sm transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_oklch(0.50_0.195_265/0.30)]"
            >
              Ver planos e preços
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={whatsappUrl("Olá! Tenho dúvidas sobre o Pulse para NR-1.")}
              className="inline-flex items-center justify-center h-11 px-7 rounded-lg border border-border bg-white font-semibold text-sm text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              Falar com a equipe
            </a>
          </div>
        </div>
      </section>


      <section id="privacidade" className="py-24 border-b border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel>✦ Privacidade garantida</SectionLabel>
              <h2 className="text-3xl font-extrabold tracking-tight mb-4 leading-tight">
                Seus colaboradores respondem com confiança. Você tem os dados que precisa.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Para as pesquisas funcionarem, os colaboradores precisam se sentir seguros para responder com
                honestidade. O Pulse foi construído para garantir esse ambiente de confiança — do ponto de vista
                técnico e legal.
              </p>
              <div className="space-y-5">
                {[
                  {
                    icon: <EyeOff className="w-5 h-5" />,
                    title: "Respostas 100% anônimas",
                    desc: "Tecnicamente impossível saber quem respondeu o quê. Nem você, nem o RH, nem o gestor. Isso encoraja respostas honestas.",
                  },
                  {
                    icon: <UserCheck className="w-5 h-5" />,
                    title: "Consentimento formal registrado",
                    desc: "Cada colaborador aceita participar antes de receber qualquer pesquisa. Esse aceite é registrado e guardado permanentemente — exigência da lei.",
                  },
                  {
                    icon: <Shield className="w-5 h-5" />,
                    title: "Dados da sua empresa isolados",
                    desc: "As informações da sua empresa não se misturam com as de nenhuma outra. Cada conta tem um ambiente completamente separado.",
                  },
                  {
                    icon: <Smile className="w-5 h-5" />,
                    title: "Colaborador pode recusar",
                    desc: "Participar é voluntário. Quem não quiser pode recusar — e essa recusa também fica registrada formalmente, protegendo a empresa.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground mb-1">{item.title}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                <CheckCircle2 className="w-7 h-7 text-green-600 mb-3" />
                <div className="font-bold text-lg text-green-900 mb-2">Em conformidade com a LGPD</div>
                <p className="text-sm text-green-800 leading-relaxed">
                  O Pulse foi desenvolvido seguindo a Lei Geral de Proteção de Dados. O consentimento é
                  coletado antes de qualquer dado, e o colaborador tem o direito de recusar — tudo
                  devidamente documentado.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="font-bold text-base mb-4">Por que isso importa para o seu negócio?</div>
                <div className="space-y-3">
                  {[
                    "Colaboradores seguros respondem com mais honestidade",
                    "Dados mais honestos = decisões melhores para a empresa",
                    "Conformidade legal protege o CNPJ de multas",
                    "Histórico imutável protege a empresa em disputas trabalhistas",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="para-quem" className="py-24 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <SectionLabel>✦ Para quem é</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Feito para quem cuida de pessoas
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Não importa o tamanho da empresa. Se você tem colaboradores, a NR-1 se aplica a você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
              <div className="font-bold text-xl text-blue-900 mb-2">Para o dono da empresa</div>
              <p className="text-sm text-blue-800 leading-relaxed mb-5">
                Você não precisa virar especialista em NR-1. Configure o Pulse uma vez, delegue para o RH
                e tenha a certeza de que a empresa está protegida — sem precisar acompanhar cada detalhe.
              </p>
              <div className="space-y-2">
                {[
                  "Conformidade garantida sem precisar entender a lei",
                  "Relatórios prontos se vier uma fiscalização",
                  "Visão clara da saúde da equipe no painel",
                  "Histórico completo de todas as ações tomadas",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-blue-900">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-700" />
              </div>
              <div className="font-bold text-xl text-purple-900 mb-2">Para o time de RH</div>
              <p className="text-sm text-purple-800 leading-relaxed mb-5">
                Chega de copiar e colar dados entre planilhas, enviar e-mails manualmente e lembrar de prazo
                no calendário. O Pulse automatiza as tarefas repetitivas para você focar no que realmente
                importa: as pessoas.
              </p>
              <div className="space-y-2">
                {[
                  "Pesquisas que se enviam sozinhas, no tempo certo",
                  "Alertas automáticos — você age só quando precisa",
                  "Importação de planilha em poucos cliques",
                  "Relatório gerado automaticamente, sem edição manual",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-purple-900">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

    
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { num: "Mai/2026", label: "Prazo da nova fiscalização NR-1", icon: <Clock className="w-5 h-5" /> },
              { num: "100%", label: "Automação no envio de pesquisas", icon: <Zap className="w-5 h-5" /> },
              { num: "1 clique", label: "Para gerar o relatório completo", icon: <FileText className="w-5 h-5" /> },
              { num: "Zero", label: "Planilhas necessárias", icon: <CheckCircle2 className="w-5 h-5" /> },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-white p-6 text-center hover:border-primary/20 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                  {item.icon}
                </div>
                <div className="text-2xl font-extrabold text-foreground mb-1">{item.num}</div>
                <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-24 border-b border-border bg-red-50/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <SectionLabel>⚠ Consequências reais</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                O que acontece se minha empresa não cumprir a NR-1?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                A nova versão da NR-1 entrou em vigor e o prazo para adequação encerra em maio de 2026.
                A partir daí, o Ministério do Trabalho e Emprego tem base legal para fiscalizar e autuar
                empresas que não demonstrarem monitoramento dos riscos psicossociais.
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: "Multas do MTE",
                    desc: "O descumprimento de normas regulamentadoras pode resultar em multas que variam de R$ 2.200 até R$ 22.000 por irregularidade, conforme o art. 201 da CLT. Reincidências dobram o valor.",
                    color: "red",
                  },
                  {
                    title: "Interdição de atividades",
                    desc: "Em casos graves, o fiscal do trabalho pode interditar setores ou até a empresa inteira até que as condições sejam sanadas — causando prejuízo operacional imediato.",
                    color: "red",
                  },
                  {
                    title: "Passivo trabalhista",
                    desc: "Colaboradores que desenvolverem problemas de saúde mental no trabalho podem acionar a empresa na Justiça do Trabalho por negligência. Sem documentação, a empresa não tem como se defender.",
                    color: "amber",
                  },
                  {
                    title: "Dano à reputação",
                    desc: "Autuações públicas do MTE aparecem em registros oficiais. Isso afeta a imagem da empresa com clientes, parceiros e candidatos a emprego.",
                    color: "amber",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-xl border p-4 ${item.color === "red" ? "border-red-200 bg-white" : "border-amber-200 bg-white"}`}
                  >
                    <div className={`font-semibold text-sm mb-1 ${item.color === "red" ? "text-red-800" : "text-amber-800"}`}>
                      {item.title}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-7">
                <CheckCircle2 className="w-8 h-8 text-green-600 mb-4" />
                <div className="font-bold text-xl text-green-900 mb-3">Com o Pulse, você tem prova</div>
                <p className="text-sm text-green-800 leading-relaxed mb-5">
                  O Pulse gera automaticamente toda a documentação que o fiscal exige: termos de
                  consentimento assinados, histórico de pesquisas enviadas, respostas agregadas por setor,
                  planos de ação com responsáveis e prazos, e o relatório consolidado do PGR — tudo com
                  data, hora e trilha de auditoria imutável.
                </p>
                <div className="space-y-2">
                  {[
                    "Consentimento formal de cada colaborador",
                    "Histórico imutável de todas as pesquisas",
                    "Alertas e planos de ação documentados",
                    "Relatório PGR gerado em 1 clique",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-green-900">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-white p-7">
                <div className="text-sm font-semibold text-muted-foreground mb-2">Quanto custa não se adequar?</div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Multa mínima MTE", value: "R$ 2.200" },
                    { label: "Multa máxima MTE", value: "R$ 22.000" },
                    { label: "Reincidência", value: "+100%" },
                    { label: "Custo de adequação", value: "A partir de R$ 0" },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="text-xl font-extrabold text-foreground">{item.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="faq" className="py-24 border-b border-border bg-muted/30">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <SectionLabel>✦ Dúvidas frequentes</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Respostas para as perguntas mais comuns
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Tudo o que você precisa saber antes de começar.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "A NR-1 se aplica a todos os tamanhos de empresa?",
                a: "Sim. A NR-1 se aplica a qualquer empresa que tenha empregados com carteira assinada (CLT), independentemente do número de colaboradores ou do setor de atuação. Microempresas e empresas de pequeno porte não estão isentas — mas podem ter obrigações simplificadas dependendo do grau de risco.",
              },
              {
                q: "Preciso contratar um consultor de segurança do trabalho para usar o Pulse?",
                a: "Não necessariamente. O Pulse automatiza a coleta de dados, o consentimento e a geração de relatórios — o que costuma ser feito manualmente por consultores. Dependendo do porte e risco da sua empresa, um técnico ou engenheiro de segurança do trabalho pode ser necessário para o PCMSO e PPRA, mas o monitoramento contínuo de fatores psicossociais fica com o Pulse.",
              },
              {
                q: "Quanto tempo leva para colocar o Pulse em funcionamento?",
                a: "Em média 20 a 30 minutos para a configuração inicial: criar a conta, importar os colaboradores via planilha, configurar os setores e a frequência das pesquisas. Depois disso, o sistema funciona automaticamente.",
              },
              {
                q: "Os colaboradores precisam baixar algum aplicativo?",
                a: "Não. Eles recebem um link pelo WhatsApp ou SMS e respondem diretamente no navegador do celular. Sem cadastro, sem download, sem atrito.",
              },
              {
                q: "Meus colaboradores podem ser identificados pelas respostas?",
                a: "Não, por design técnico. O link de pesquisa é desvinculado da resposta no momento em que o colaborador a envia. Nem o RH, nem o gestor, nem os administradores da plataforma conseguem saber quem respondeu o quê. As métricas só são exibidas quando há ao menos 5 respondentes — mais uma camada de proteção ao anonimato.",
              },
              {
                q: "E se um colaborador não quiser participar?",
                a: "Participação é totalmente voluntária. O colaborador pode recusar o consentimento ou pedir para sair a qualquer momento. Essa recusa é registrada formalmente no sistema — o que também protege a empresa de eventuais alegações de que o monitoramento foi feito sem consentimento.",
              },
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim. Sem fidelidade, sem multa de saída. Você pode cancelar pelo próprio painel da plataforma. Seus dados ficam disponíveis para exportação por 30 dias após o cancelamento.",
              },
              {
                q: "O Pulse está em conformidade com a LGPD?",
                a: "Sim. O sistema coleta consentimento explícito antes de qualquer dado, armazena apenas as informações necessárias, garante anonimato técnico nas respostas e mantém trilha de auditoria de todas as operações. Dados de diferentes empresas são completamente isolados entre si.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-white overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-sm text-foreground hover:bg-muted/30 transition-colors">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">Ainda tem dúvidas?</p>
            <a
              href={whatsappUrl("Olá! Tenho algumas dúvidas sobre o Pulse antes de contratar.")}
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg border border-border text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              Falar com a equipe no WhatsApp
            </a>
          </div>
        </div>
      </section>


      <section
        className="py-24"
        style={{ background: "linear-gradient(135deg, oklch(0.50 0.195 265) 0%, oklch(0.42 0.18 285) 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <AnimateIn animation="fade-in">
            <Globe className="w-10 h-10 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Comece hoje. A fiscalização não espera.
            </h2>
            <p className="text-lg opacity-80 mb-10 leading-relaxed">
              Cada dia sem o Pulse é um dia com risco de auditoria, documentação incompleta e horas de trabalho
              manual que poderiam ser automáticas. Configure em minutos e durma tranquilo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#planos"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-white text-primary font-bold text-base transition-all hover:bg-white/90"
              >
                Ver planos e começar
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-12 px-8 rounded-lg border-2 border-white/40 text-white font-semibold text-base hover:bg-white/10 transition-all"
              >
                Já tenho uma conta
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>


      <footer className="py-12 bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/"><Logo size="sm" /></Link>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Pulse — Solução para NR-1. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">← Voltar ao início</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Acessar plataforma</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
