import Link from "next/link"
import { CheckCircle2, XCircle, ClipboardList, Bell, FileText, Users, BarChart3, ArrowRight, Building2, Star, MessageSquare, ChevronDown } from "lucide-react"
import { getAllPlans } from "@/modules/plans/plan.service"
import { ALL_DISPLAY_FEATURES } from "@/modules/plans/plan.types"
import { env } from "@/env"
import { AnimateIn } from "@/components/animate-in"
import { LpHeader } from "@/app/lp-header"
import { Logo } from "@/libs/design-system/components/logo"

export const dynamic = "force-dynamic"

function formatPrice(priceInCents: number, currency: string, interval: string): string {
  const amount = (priceInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  })
  return `${amount}/${interval === "year" ? "ano" : "mês"}`
}

function whatsappUrl(message: string): string {
  return `https://wa.me/${env.NEXT_PUBLIC_CONSULTANT_WHATSAPP}?text=${encodeURIComponent(message)}`
}

export default async function LandingPage(): Promise<React.ReactElement> {
  const plansFromDb = (await getAllPlans().catch(() => [])).sort((a, b) => {
    const aPrice = a.prices.find((p) => p.interval === "month")?.priceInCents ?? Infinity
    const bPrice = b.prices.find((p) => p.interval === "month")?.priceInCents ?? Infinity
    return aPrice - bPrice
  })
  return (
    <div className="min-h-screen bg-background text-foreground">

      <LpHeader />

      <section
        className="relative overflow-hidden pt-24 pb-20 lp-hero-bg"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.705 0.128 164) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.705 0.128 164 / 0.12) 0%, transparent 70%)", animation: "lp-float 8s ease-in-out infinite" }}
        />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-6" style={{ animation: "lp-fade-in 0.5s ease-out both" }}>
            <BarChart3 className="w-3.5 h-3.5" />
            Monitoramento de bem-estar corporativo
          </div>
          <h1
            className="lp-hero-title text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6"
            style={{ animation: "lp-fade-in-up 0.7s 0.1s ease-out both" }}
          >
            Saiba o que sua equipe<br />está sentindo.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animation: "lp-fade-in-up 0.7s 0.2s ease-out both" }}>
            O Pulse envia pesquisas anônimas automaticamente, detecta sinais de alerta por setor
            e ajuda você a agir antes que os problemas afetem a performance da equipe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ animation: "lp-fade-in-up 0.7s 0.32s ease-out both" }}>
            <a
              href="#planos"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-primary text-white font-semibold text-base transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_oklch(0.705_0.128_164/0.30)]"
            >
              Ver planos e preços
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/learn-more"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg border-2 border-border bg-background font-semibold text-base text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              Como funciona
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-12 text-sm text-muted-foreground" style={{ animation: "lp-fade-in-up 0.7s 0.5s ease-out both" }}>
            {(
              [
                ["< 30 min", "Para configurar e começar"],
                ["100%", "Anonimato nas respostas"],
                ["Automático", "Envio de pesquisas por setor"],
              ] as [string, string][]
            ).map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold text-primary">{num}</div>
                <div className="mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="recursos" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Tudo para monitorar e melhorar o bem-estar da sua equipe</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Uma plataforma integrada que cobre todo o ciclo de gestão de saúde e clima organizacional.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <ClipboardList className="w-5 h-5" />,
              title: "Pesquisas automáticas via WhatsApp",
              desc: "Configure a frequência e o horário de cada setor. O Pulse envia as pesquisas automaticamente para cada colaborador — sem nenhuma intervenção manual.",
            },
            {
              icon: <BarChart3 className="w-5 h-5" />,
              title: "Painel por setor em tempo real",
              desc: "Acompanhe a pontuação de bem-estar e a taxa de participação de cada departamento. Veja tendências e evolução ao longo do tempo.",
            },
            {
              icon: <Bell className="w-5 h-5" />,
              title: "Alertas antes que vire problema",
              desc: "O sistema detecta quedas de pontuação, tendências negativas e baixa adesão. Você recebe um alerta e age antes que a situação cresça.",
            },
            {
              icon: <MessageSquare className="w-5 h-5" />,
              title: "Canal de relatos anônimos",
              desc: "Colaboradores podem relatar situações difíceis de forma completamente anônima. Você sabe o que está acontecendo sem expor ninguém.",
            },
            {
              icon: <FileText className="w-5 h-5" />,
              title: "Planos de ação documentados",
              desc: "Registre ações com responsável, prazo e acompanhamento. Saiba o que foi decidido, quando e por quem — tudo em um único lugar.",
            },
            {
              icon: <Users className="w-5 h-5" />,
              title: "Relatório consolidado em PDF",
              desc: "Gere um relatório completo com métricas, alertas, planos de ação e histórico com um clique. Pronto para apresentar a qualquer momento.",
            },
          ].map((feature, i) => (
            <AnimateIn key={feature.title} delay={i * 80}>
              <div className="rounded-xl border border-border bg-card p-6 lp-feature-card hover:shadow-[0_4px_24px_oklch(0.705_0.128_164/0.12)] transition-all h-full">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="py-24 lp-steps-section border-y border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Como funciona</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Implantação simples, resultado imediato.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Cadastre sua equipe",
                desc: "Importe via planilha Excel ou cadastre os colaboradores e departamentos em minutos. Configure os responsáveis de RH.",
              },
              {
                step: "02",
                title: "Configure e esqueça",
                desc: "Defina a frequência das pesquisas e o horário de expediente de cada setor. O Pulse cuida do envio automaticamente.",
              },
              {
                step: "03",
                title: "Acompanhe e aja",
                desc: "Monitore os indicadores no painel, receba alertas automáticos e registre as ações tomadas com responsável e prazo.",
              },
            ].map((item, i) => (
              <AnimateIn key={item.step} delay={i * 110} animation="fade-in-up">
                <div className="flex flex-col items-start">
                  <div className="lp-step-number">{item.step}</div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Planos e preços</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Sem surpresas. Cancele quando quiser.</p>
        </div>

        {plansFromDb.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Planos em configuração</p>
            <p className="text-sm mb-6">Entre em contato para conhecer nossas opções.</p>
            <a
              href={whatsappUrl("Olá! Gostaria de saber mais sobre o Pulse.")}
              className="inline-flex items-center justify-center h-11 px-8 rounded-lg bg-primary text-white font-semibold text-sm"
            >
              Falar com a equipe
            </a>
          </div>
        ) : (
          <>
            {(() => {
              let gridClass: string
              if (plansFromDb.length === 1) {
                gridClass = "max-w-sm mx-auto"
              } else if (plansFromDb.length === 2) {
                gridClass = "md:grid-cols-2 max-w-3xl mx-auto"
              } else {
                gridClass = "md:grid-cols-3"
              }
              return (
            <div className={`grid gap-6 items-start ${gridClass}`}>
            {plansFromDb.map((plan, index) => {
              const isHighlight = plansFromDb.length >= 2 && index === Math.floor((plansFromDb.length - 1) / 2)
              const monthlyPrice = plan.prices.find((p) => p.interval === "month")
              const yearlyPrice = plan.prices.find((p) => p.interval === "year")
              const primaryPrice = monthlyPrice ?? yearlyPrice ?? null
              const highlightSecondary = isHighlight ? "text-white/70" : "text-muted-foreground"
              const enabledFeatureKeys = new Set<string>(plan.features)

              return (
                <AnimateIn key={plan.id} delay={index * 100} animation="scale-in">
                  <div
                    className={`rounded-2xl border p-8 flex flex-col gap-6 transition-all relative h-full ${
                    isHighlight
                      ? "border-primary bg-primary shadow-[0_8px_40px_oklch(0.705_0.128_164/0.28)] text-white"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-[0_4px_20px_oklch(0.228_0.025_249/0.06)]"
                  }`}
                >
                  {isHighlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-primary text-xs font-bold shadow">
                      <Star className="w-3 h-3 fill-current" /> Mais popular
                    </div>
                  )}
                  <div>
                    <div className={`text-sm font-semibold mb-1 ${highlightSecondary}`}>
                      {plan.name}
                    </div>
                    {primaryPrice ? (
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-extrabold tracking-tight">
                          {(primaryPrice.priceInCents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: primaryPrice.currency.toUpperCase(),
                            minimumFractionDigits: 0,
                          })}
                        </span>
                        <span className={`text-sm mb-1 ${highlightSecondary}`}>
                          /{primaryPrice.interval === "year" ? "ano" : "mês"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-3xl font-extrabold tracking-tight">Sob consulta</div>
                    )}
                    <div className={`text-xs mt-1 font-medium ${highlightSecondary}`}>
                      Até {plan.maxEmployees} funcionários
                    </div>
                  </div>

                  {plan.description && (
                    <p className={`text-sm leading-relaxed ${isHighlight ? "text-white/80" : "text-muted-foreground"}`}>
                      {plan.description}
                    </p>
                  )}

                  <ul className="space-y-2">
                    {[...ALL_DISPLAY_FEATURES]
                      .sort((a, b) => {
                        const aEnabled = a.alwaysEnabled || enabledFeatureKeys.has(a.key)
                        const bEnabled = b.alwaysEnabled || enabledFeatureKeys.has(b.key)
                        if (aEnabled === bEnabled) return 0
                        return aEnabled ? -1 : 1
                      })
                      .map((displayFeature) => {
                      const isEnabled = displayFeature.alwaysEnabled || enabledFeatureKeys.has(displayFeature.key)
                      const itemClass = isEnabled
                        ? `text-sm flex items-center gap-2 ${isHighlight ? "text-white/90" : "text-foreground"}`
                        : `text-sm flex items-center gap-2 ${isHighlight ? "text-white/40" : "text-muted-foreground/50"}`
                      return (
                        <li key={displayFeature.key} className={itemClass}>
                          {isEnabled ? (
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isHighlight ? "text-white" : "text-primary"}`} />
                          ) : (
                            <XCircle className="w-4 h-4 shrink-0 text-destructive/60" />
                          )}
                          {displayFeature.label}
                        </li>
                      )
                    })}
                  </ul>

                  {plan.prices.length > 1 && (
                    <ul className="space-y-1.5">
                      {plan.prices.map((price) => (
                        <li key={price.id} className={`text-xs flex items-center gap-2 ${highlightSecondary}`}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {formatPrice(price.priceInCents, price.currency, price.interval)}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex-1" />

                  {primaryPrice ? (
                    <Link
                      href={`/checkout?priceId=${primaryPrice.id}`}
                      className={`inline-flex items-center justify-center h-11 rounded-lg font-semibold text-sm transition-all ${
                        isHighlight
                          ? "bg-white/20 text-white hover:bg-white/30 border border-white/30"
                          : "bg-primary text-white hover:-translate-y-px hover:shadow-[0_6px_20px_oklch(0.705_0.128_164/0.28)]"
                      }`}
                    >
                      Contratar agora
                    </Link>
                  ) : (
                    <a
                      href={whatsappUrl("Olá! Tenho interesse no Pulse. Poderia me ajudar?")}
                      className={`inline-flex items-center justify-center h-11 rounded-lg font-semibold text-sm transition-all ${
                        isHighlight
                          ? "bg-white/20 text-white hover:bg-white/30 border border-white/30"
                          : "border border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      Falar com vendas
                    </a>
                  )}
                </div>
                </AnimateIn>
              )
            })}
          </div>
              )
            })()} </>
        )}
      </section>

      <section id="faq" className="py-24 lp-section-alt border-y border-border">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Dúvidas frequentes</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Tudo o que você precisa saber antes de começar.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Os colaboradores precisam instalar algum aplicativo?",
                a: "Não. O colaborador recebe um link pelo WhatsApp e responde diretamente no navegador do celular. Sem cadastro, sem download, sem fricção.",
              },
              {
                q: "Quanto tempo leva para configurar e começar?",
                a: "Em média 20 a 30 minutos. Você cria a conta, importa sua equipe via planilha Excel, configura a frequência das pesquisas e está pronto. O sistema cuida do resto automaticamente.",
              },
              {
                q: "As respostas são realmente anônimas?",
                a: "Sim, por design técnico. Após o colaborador abrir o link da pesquisa, qualquer vínculo entre o token e a resposta é eliminado. Nem o RH, nem o gestor, nem nenhum administrador consegue saber quem respondeu o quê.",
              },
              {
                q: "Com que frequência posso enviar as pesquisas?",
                a: "Você escolhe: diariamente, duas vezes por semana, semanalmente, quinzenalmente ou mensalmente. Cada setor pode ter sua própria configuração de frequência e horário.",
              },
              {
                q: "E se o colaborador não quiser participar?",
                a: "Participação é sempre voluntária. O colaborador recebe um link exclusivo de consentimento (TCLE) antes de qualquer pesquisa. Pode recusar a qualquer momento — a recusa fica registrada no sistema.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Sem fidelidade, sem multa. Você pode cancelar a qualquer momento pelo próprio painel da plataforma. Seus dados ficam disponíveis para exportação por 30 dias após o cancelamento.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-card overflow-hidden"
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
        className="py-24 border-y border-border"
        style={{ background: "linear-gradient(135deg, oklch(0.705 0.128 164) 0%, oklch(0.580 0.120 164) 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <AnimateIn animation="fade-in">
            <Building2 className="w-10 h-10 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Cuide da sua equipe com dados reais
          </h2>
          <p className="text-lg opacity-80 mb-10 leading-relaxed">
            Deixe de agir no escuro. Com o Pulse, você monitora o bem-estar dos colaboradores continuamente e age no momento certo — antes que os problemas afetem a performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#planos"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-white text-primary font-bold text-base transition-all hover:bg-white/90"
            >
              Escolher um plano
              <ArrowRight className="w-4 h-4" />
            </a>
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

      <footer className="py-12 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div className="flex flex-col gap-3">
              <Logo size="sm" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Monitoramento contínuo de saúde ocupacional para equipes de alto desempenho.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-10">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-widest uppercase text-foreground">Produto</span>
                <Link href="/learn-more" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</Link>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Acessar plataforma</Link>
                <a href="mailto:contato@pulse.com.br" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contato</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-widest uppercase text-foreground">Legal</span>
                <Link href="/platform-terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termos de Uso</Link>
                <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Política de Privacidade</Link>
                <Link href="/consent-terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termo de Consentimento</Link>
                <Link href="/data-deletion" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Exclusão de Dados</Link>
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
