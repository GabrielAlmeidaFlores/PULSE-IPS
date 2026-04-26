import Link from "next/link"
import {
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
  Clock,
  ChevronRight,
  ChevronDown,
  Smile,
  TrendingUp,
  X,
  Heart,
} from "lucide-react"
import { Logo } from "@/libs/design-system/components/logo"
import { AnimateIn } from "@/components/animate-in"

function whatsappUrl(message: string): string {
  return `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`
}

export const metadata = {
  title: "Como o Pulse funciona — Saiba mais",
  description:
    "Entenda como o Pulse monitora o bem-estar da sua equipe com pesquisas anônimas automáticas, alertas inteligentes e relatórios completos.",
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
            <a href="#desafio" className="hover:text-foreground transition-colors">O desafio</a>
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
        style={{ background: "linear-gradient(160deg, oklch(0.97 0.010 258) 0%, oklch(0.975 0.004 258) 60%, oklch(0.97 0.010 258) 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.705 0.180 265) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.705 0.180 265 / 0.07) 0%, transparent 70%)", animation: "lp-float 9s ease-in-out infinite" }}
        />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-6" style={{ animation: "lp-fade-in 0.5s ease-out both" }}>
            <Heart className="w-3.5 h-3.5" />
            Bem-estar e performance corporativa
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
            Sua equipe mais saudável.<br />Sua empresa mais forte.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed" style={{ animation: "lp-fade-in-up 0.7s 0.22s ease-out both" }}>
            O Pulse monitora continuamente o bem-estar dos colaboradores com pesquisas anônimas
            automáticas, alertas inteligentes e relatórios completos — sem trabalho manual para o RH.
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


      <section id="desafio" className="py-24 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <AnimateIn animation="fade-in-up">
              <div>
                <SectionLabel>✦ O cenário atual</SectionLabel>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                  Gestão de saúde ocupacional hoje é um desafio
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  A maioria das empresas tenta entender o bem-estar da equipe com planilhas espalhadas,
                  pesquisas manuais e conversas informais. O resultado é sempre o mesmo: dados imprecisos,
                  horas perdidas e problemas que só aparecem quando já viraram crise.
                </p>
                <div className="space-y-3">
                  {[
                    "Sem dados reais sobre o bem-estar da equipe",
                    "RH gasta horas em tarefas que poderiam ser automáticas",
                    "Problemas de clima passam despercebidos até virar crise",
                    "Colaboradores não falam o que pensam por medo de identificação",
                    "Histórico de ações espalhado, difícil de consultar",
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
                  title: "Gestão no escuro",
                  desc: "decisões tomadas sem dados reais sobre como a equipe está",
                },
                {
                  border: "border-amber-100",
                  bg: "linear-gradient(135deg, oklch(0.98 0.01 80) 0%, oklch(0.97 0.005 75) 100%)",
                  label: "Problema invisível",
                  labelColor: "text-amber-700",
                  title: "Crise silenciosa",
                  desc: "turnover alto, afastamentos e queda de produtividade sem sinal de alerta",
                },
                {
                  border: "border-primary/20",
                  bg: "linear-gradient(135deg, oklch(0.97 0.010 258) 0%, oklch(0.975 0.004 258) 100%)",
                  label: "Com o Pulse",
                  labelColor: "text-primary",
                  title: "Monitoramento contínuo",
                  desc: "dados reais por setor, alertas automáticos e histórico completo de ações",
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
              Tudo para monitorar, entender e melhorar o bem-estar da sua equipe
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O Pulse reúne todas as ferramentas que o RH precisa para agir com base em dados reais —
              e ainda avisa quando é preciso agir.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Clock className="w-5 h-5" />,
                title: "Envio sempre no momento certo",
                desc: "Você define os dias da semana e o horário de expediente de cada equipe. O Pulse só envia pesquisas quando o colaborador está trabalhando — nunca fora do horário.",
                benefit: "Respeito ao colaborador",
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: "Sua equipe organizada por setor",
                desc: "Cadastre seus colaboradores por setor em minutos — ou importe uma planilha Excel de uma vez. O Pulse organiza tudo automaticamente.",
                benefit: "Chega de planilha bagunçada",
              },
              {
                icon: <UserCheck className="w-5 h-5" />,
                title: "Consentimento no piloto automático",
                desc: "Na primeira pesquisa, o colaborador lê os termos de participação e decide se quer continuar. O aceite fica registrado automaticamente.",
                benefit: "Participação voluntária e documentada",
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
                desc: "Veja em tempo real como está cada setor — taxa de participação, pontuação de bem-estar e evolução ao longo do tempo.",
                benefit: "Decisões com base em dados",
              },
              {
                icon: <Bell className="w-5 h-5" />,
                title: "Alertas antes que vire problema",
                desc: "O sistema monitora as respostas e te avisa quando algum setor precisa de atenção. Você age antes que uma situação pequena se torne um problema grande.",
                benefit: "Gestão proativa, não reativa",
              },
              {
                icon: <CheckCircle2 className="w-5 h-5" />,
                title: "Registro de todas as ações",
                desc: "Cada medida tomada pelo RH fica documentada com data, responsável e resultado. Histórico completo sempre acessível.",
                benefit: "Rastreabilidade total",
              },
              {
                icon: <MessageSquare className="w-5 h-5" />,
                title: "Canal aberto para sua equipe",
                desc: "Colaboradores podem relatar situações difíceis de forma completamente anônima. Você sabe o que está acontecendo sem expor ninguém.",
                benefit: "Ambiente mais saudável",
              },
              {
                icon: <FileText className="w-5 h-5" />,
                title: "Relatório completo com um clique",
                desc: "Precisou apresentar um relatório? O Pulse gera o documento em PDF em segundos, com todos os dados do período organizados.",
                benefit: "Nunca mais corre na última hora",
              },
            ].map((item, i) => (
              <AnimateIn key={item.title} delay={i * 60}>
                <div className="rounded-xl border border-border bg-white p-6 hover:border-primary/30 hover:shadow-[0_4px_20px_oklch(0.50_0.195_265/0.08)] transition-all group h-full">
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
              Do cadastro do primeiro colaborador até o relatório completo.
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
              { actor: "pulse", icon: <MessageSquare className="w-5 h-5" />, title: "Pulse envia a primeira pesquisa", desc: "O colaborador recebe o link da pesquisa pelo WhatsApp ou SMS, dentro do horário de expediente." },
              { actor: "colaborador", icon: <UserCheck className="w-5 h-5" />, title: "Colaborador aceita ao responder", desc: "Na primeira vez, o colaborador lê os termos e confirma a participação. Sem papel, sem burocracia. O aceite fica registrado automaticamente." },
              { actor: "voce", icon: <ClipboardList className="w-5 h-5" />, title: "Você configura a pesquisa uma vez", desc: "Define as perguntas e com que frequência enviar — diariamente, semanalmente, quinzenalmente ou mensalmente." },
              { actor: "voce", icon: <Clock className="w-5 h-5" />, title: "Você define o expediente de cada equipe", desc: "Configura os dias da semana e o horário de trabalho de cada setor. Equipes com turnos diferentes têm suas próprias configurações." },
              { actor: "pulse", icon: <Zap className="w-5 h-5" />, title: "Pulse dispara as pesquisas automaticamente", desc: "Só envia dentro do horário de expediente configurado. O colaborador recebe a mensagem quando está trabalhando." },
              { actor: "colaborador", icon: <EyeOff className="w-5 h-5" />, title: "Colaborador responde — com total anonimato", desc: "Sem login, sem identificação. Só as respostas. Ninguém na empresa sabe quem disse o quê." },
              { actor: "pulse", icon: <BarChart3 className="w-5 h-5" />, title: "Pulse analisa e atualiza o painel", desc: "Os indicadores de cada setor são calculados automaticamente. Você vê tudo no painel em tempo real." },
              { actor: "pulse", icon: <Bell className="w-5 h-5" />, title: "Pulse avisa quando há algo a resolver", desc: "Se algum setor tiver queda nos resultados ou baixa participação, você recebe um alerta para agir." },
              { actor: "voce", icon: <CheckCircle2 className="w-5 h-5" />, title: "Você registra a ação que tomou", desc: "Uma conversa com o gestor, um treinamento, uma mudança de processo. Registra no sistema com responsável e prazo." },
              { actor: "pulse", icon: <FileText className="w-5 h-5" />, title: "Pulse documenta tudo permanentemente", desc: "Cada ação registrada, cada aceite de participação, cada pesquisa enviada. O histórico é imutável." },
              { actor: "voce", icon: <CheckCircle2 className="w-5 h-5" />, title: "Você gera o relatório com um clique", desc: "Quando precisar, abre a plataforma, seleciona o período e clica em gerar. O documento está pronto em segundos.", isLast: true },
            ] as { actor: FlowActor; icon: React.ReactElement; title: string; desc: string; isLast?: true }[]).map((card, i) => (
              <AnimateIn key={card.title} delay={i * 50} animation="fade-in-up">
                <FlowCard
                  actor={card.actor}
                  icon={card.icon}
                  title={card.title}
                  desc={card.desc}
                  {...(card.isLast === true ? { isLast: true } : {})}
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
                  Respostas coletadas no contexto do trabalho são muito mais precisas e representativas.
                  O colaborador está no ambiente profissional, com os temas ainda frescos — o que resulta
                  em dados mais confiáveis para o RH tomar decisões. Além disso, respeitar o horário
                  de descanso demonstra cuidado genuíno com quem responde.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    {
                      title: "Dados mais precisos",
                      desc: "Respostas dadas no contexto do trabalho refletem melhor a realidade do ambiente — não o humor do fim de semana.",
                    },
                    {
                      title: "Respeito ao colaborador",
                      desc: "Não invadir o tempo de descanso mostra cuidado genuíno com quem recebe as mensagens.",
                    },
                    {
                      title: "Taxas de resposta maiores",
                      desc: "Colaboradores no trabalho respondem mais — e com mais atenção. Isso melhora a qualidade dos dados.",
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
            Pronto para monitorar o bem-estar da sua equipe?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Configure o Pulse em menos de 30 minutos e comece a ter dados reais sobre como sua equipe está.
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
              href={whatsappUrl("Olá! Tenho dúvidas sobre o Pulse.")}
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
                Para as pesquisas funcionarem, os colaboradores precisam se sentir seguros para responder
                com honestidade. O Pulse foi construído do zero para garantir esse ambiente de confiança.
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
                    desc: "Na primeira pesquisa, o colaborador lê os termos e decide se quer participar. O aceite fica registrado e guardado permanentemente.",
                  },
                  {
                    icon: <CheckCircle2 className="w-5 h-5" />,
                    title: "Dados da sua empresa isolados",
                    desc: "As informações da sua empresa não se misturam com as de nenhuma outra. Cada conta tem um ambiente completamente separado.",
                  },
                  {
                    icon: <Smile className="w-5 h-5" />,
                    title: "Colaborador pode recusar",
                    desc: "Participar é voluntário. Quem não quiser pode recusar — e essa escolha também fica registrada, protegendo ambos os lados.",
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
                <div className="font-bold text-lg text-green-900 mb-2">Privacidade que gera confiança</div>
                <p className="text-sm text-green-800 leading-relaxed">
                  O anonimato não é apenas uma promessa — é uma garantia técnica. Após o colaborador
                  abrir o link da pesquisa, qualquer vínculo entre o token e a resposta é eliminado
                  automaticamente. Ninguém no sistema consegue reverter esse processo.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="font-bold text-base mb-4">Por que isso importa para o seu negócio?</div>
                <div className="space-y-3">
                  {[
                    "Colaboradores seguros respondem com mais honestidade",
                    "Dados mais honestos = decisões melhores para a empresa",
                    "Ambiente de confiança reduz turnover e melhora o engajamento",
                    "Histórico documentado protege a empresa em eventuais disputas",
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
              Não importa o tamanho da empresa. Se você tem equipe, você precisa de dados sobre ela.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
              <div className="font-bold text-xl text-blue-900 mb-2">Para o dono da empresa</div>
              <p className="text-sm text-blue-800 leading-relaxed mb-5">
                Configure o Pulse uma vez, delegue para o RH e tenha a certeza de que a empresa está
                com o bem-estar da equipe monitorado — sem precisar acompanhar cada detalhe.
              </p>
              <div className="space-y-2">
                {[
                  "Visão clara da saúde de cada setor no painel",
                  "Alertas automáticos quando algo precisa de atenção",
                  "Relatórios prontos sempre que precisar",
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
                Chega de copiar e colar dados entre planilhas e enviar mensagens manualmente.
                O Pulse automatiza as tarefas repetitivas para você focar no que realmente importa: as pessoas.
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
              { num: "100%", label: "Automação no envio de pesquisas", icon: <Zap className="w-5 h-5" /> },
              { num: "1 clique", label: "Para gerar o relatório completo em PDF", icon: <FileText className="w-5 h-5" /> },
              { num: "Zero", label: "Planilhas necessárias para o RH", icon: <CheckCircle2 className="w-5 h-5" /> },
              { num: "< 30 min", label: "Para configurar e começar a monitorar", icon: <Clock className="w-5 h-5" /> },
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
                q: "Os colaboradores precisam criar uma conta ou instalar algum aplicativo?",
                a: "Não. Eles recebem um link pelo WhatsApp ou SMS e respondem diretamente no navegador do celular. Sem cadastro, sem download, sem fricção.",
              },
              {
                q: "As respostas são realmente anônimas?",
                a: "Sim, por garantia técnica. Após o colaborador abrir o link, qualquer vínculo entre o token e a resposta é eliminado automaticamente. Ninguém no sistema — nem o RH, nem o gestor, nem o administrador — consegue saber quem respondeu o quê.",
              },
              {
                q: "Posso configurar frequências diferentes por setor?",
                a: "Sim. Cada setor tem sua própria configuração: frequência de envio (diária, semanal, quinzenal ou mensal), dias da semana e horário de expediente. Equipes com turnos especiais também têm configuração individual por colaborador.",
              },
              {
                q: "Como funcionam os alertas automáticos?",
                a: "O Pulse monitora continuamente os resultados de cada setor e detecta três situações: queda brusca na pontuação, tendência negativa em múltiplos períodos e baixa taxa de resposta. Quando qualquer uma dessas situações ocorre, um alerta aparece no painel para o RH agir.",
              },
              {
                q: "O que é o relatório em PDF?",
                a: "É um documento consolidado com métricas por setor, histórico de alertas, planos de ação e resultados de pesquisas. Você escolhe o período, clica em gerar e baixa o arquivo em segundos — pronto para apresentar a diretores, sócios ou qualquer interessado.",
              },
              {
                q: "E se um colaborador não quiser participar?",
                a: "Participação é sempre voluntária. Na primeira pesquisa, o colaborador pode recusar os termos e sair a qualquer momento. Essa escolha fica registrada no sistema e o colaborador deixa de receber pesquisas.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Sem fidelidade, sem multa. Você cancela quando quiser pelo próprio painel. Seus dados ficam disponíveis para exportação por 30 dias após o cancelamento.",
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
        style={{ background: "linear-gradient(135deg, oklch(0.50 0.195 265) 0%, oklch(0.40 0.180 265) 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <AnimateIn animation="fade-in">
            <Heart className="w-10 h-10 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Cuide da sua equipe com dados reais
            </h2>
            <p className="text-lg opacity-80 mb-10 leading-relaxed">
              Deixe de agir no escuro. Com o Pulse, você monitora o bem-estar dos colaboradores
              continuamente e age antes que os problemas afetem a performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#planos"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-white text-primary font-bold text-base transition-all hover:bg-white/90"
              >
                Escolher um plano
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={whatsappUrl("Olá! Gostaria de falar com um consultor sobre o Pulse.")}
                className="inline-flex items-center justify-center h-12 px-8 rounded-lg border-2 border-white/40 text-white font-semibold text-base hover:bg-white/10 transition-all"
              >
                Falar com um consultor
              </a>
            </div>
          </AnimateIn>
        </div>
      </section>

      <footer className="py-12 bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div className="flex flex-col gap-3">
              <Link href="/"><Logo size="sm" /></Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                Monitoramento contínuo de saúde ocupacional para equipes de alto desempenho.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-10">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-widest uppercase text-foreground">Produto</span>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Início</Link>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Acessar plataforma</Link>
                <a href="mailto:contato@pulse.com.br" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contato</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-widest uppercase text-foreground">Legal</span>
                <Link href="/platform-terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termos de Uso</Link>
                <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Política de Privacidade</Link>
                <Link href="/consent-terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termo de Consentimento</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Pulse — Saúde Ocupacional. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
