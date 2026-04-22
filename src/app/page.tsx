import Link from "next/link"
import { CheckCircle2, Shield, ClipboardList, Bell, FileText, Users, BarChart3, ArrowRight, Building2, Star, AlertTriangle, ChevronDown } from "lucide-react"
import { Logo } from "@/libs/design-system/components/logo"
import { getAllPlans } from "@/modules/plans/plan.service"
import { env } from "@/env"
import { AnimateIn } from "@/components/animate-in"

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
  const plansFromDb = await getAllPlans()
  return (
    <div className="min-h-screen bg-white text-foreground">

      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="hover:text-foreground transition-colors">Dúvidas</a>
            <Link href="/learn-more" className="hover:text-foreground transition-colors">Saiba mais</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Entrar
            </Link>
            <a
              href="#planos"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_oklch(0.50_0.195_265/0.28)]"
            >
              Começar agora
            </a>
          </div>
        </div>
      </header>

      <div className="bg-amber-500 text-white text-center py-2.5 px-4 text-xs font-semibold tracking-wide">
        <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
        NR-1 obrigatória a partir de <strong>maio de 2026</strong> — sua empresa já está preparada?{" "}
        <Link href="/learn-more" className="underline underline-offset-2 hover:no-underline">Entenda o risco</Link>
      </div>

      <section
        className="relative overflow-hidden pt-24 pb-20"
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
          style={{ background: "radial-gradient(circle, oklch(0.50 0.195 265 / 0.08) 0%, transparent 70%)", animation: "lp-float 8s ease-in-out infinite" }}
        />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-6" style={{ animation: "lp-fade-in 0.5s ease-out both" }}>
            <Shield className="w-3.5 h-3.5" />
            Conformidade com a NR-1 simplificada
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
            Saúde ocupacional<br />sob controle.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animation: "lp-fade-in-up 0.7s 0.2s ease-out both" }}>
            O Pulse é a plataforma que ajuda empresas a cumprir a{" "}
            <strong className="text-foreground font-semibold">NR-1</strong> de forma eficiente — gerenciando riscos,
            pesquisas de saúde e planos de ação em um único lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ animation: "lp-fade-in-up 0.7s 0.32s ease-out both" }}>
            <a
              href="#planos"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-primary text-white font-semibold text-base transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_oklch(0.50_0.195_265/0.30)]"
            >
              Ver planos e preços
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/learn-more"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg border-2 border-border bg-white font-semibold text-base text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              Como funciona
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-12 text-sm text-muted-foreground" style={{ animation: "lp-fade-in-up 0.7s 0.5s ease-out both" }}>
            {(
              [
                ["mai/2026", "Prazo legal da nova NR-1"],
                ["< 30 min", "Para configurar e estar pronto"],
                ["100%", "Anonimato nas respostas"],
              ] as [string, string][]
            ).map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold text-foreground">{num}</div>
                <div className="mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="recursos" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Tudo que você precisa para a NR-1</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Uma plataforma integrada que cobre todo o ciclo de gestão de saúde e riscos ocupacionais.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Users className="w-5 h-5" />,
              title: "Gestão de Funcionários",
              desc: "Cadastro completo de colaboradores com histórico de saúde, departamentos e status de conformidade.",
            },
            {
              icon: <ClipboardList className="w-5 h-5" />,
              title: "Pesquisas de Saúde",
              desc: "Crie e dispare pesquisas de clima e bem-estar por link. Respostas analisadas automaticamente.",
            },
            {
              icon: <Bell className="w-5 h-5" />,
              title: "Alertas Inteligentes",
              desc: "Detecção automática de funcionários com pontuação crítica antes que vire um problema.",
            },
            {
              icon: <Shield className="w-5 h-5" />,
              title: "Planos de Ação",
              desc: "Registre, acompanhe e documente ações corretivas para conformidade com auditores.",
            },
            {
              icon: <FileText className="w-5 h-5" />,
              title: "PGR Automatizado",
              desc: "Gere o Programa de Gerenciamento de Riscos atualizado com base nos dados coletados.",
            },
            {
              icon: <BarChart3 className="w-5 h-5" />,
              title: "Dashboard em Tempo Real",
              desc: "Indicadores consolidados por departamento. Visão executiva sempre atualizada.",
            },
          ].map((feature, i) => (
            <AnimateIn key={feature.title} delay={i * 80}>
              <div className="rounded-xl border border-border bg-white p-6 hover:border-primary/30 hover:shadow-[0_4px_20px_oklch(0.18_0.022_258/0.06)] transition-all h-full">
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Como funciona</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Implantação simples, resultado imediato.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Contrate o plano",
                desc: "Escolha o plano adequado para o tamanho da sua empresa e receba o acesso em minutos.",
              },
              {
                step: "02",
                title: "Cadastre sua equipe",
                desc: "Importe ou cadastre seus funcionários e departamentos. Configure os responsáveis de RH.",
              },
              {
                step: "03",
                title: "Monitore e comprove",
                desc: "Dispare pesquisas, acompanhe alertas, gere planos de ação e tenha o PGR sempre pronto.",
              },
            ].map((item, i) => (
              <AnimateIn key={item.step} delay={i * 110} animation="fade-in-up">
                <div className="flex flex-col items-start">
                  <div className="text-5xl font-black text-primary/15 mb-4 leading-none">{item.step}</div>
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

              return (
                <AnimateIn key={plan.id} delay={index * 100} animation="scale-in">
                  <div
                    className={`rounded-2xl border p-8 flex flex-col gap-6 transition-all relative h-full ${
                    isHighlight
                      ? "border-primary bg-primary shadow-[0_8px_40px_oklch(0.50_0.195_265/0.25)] text-white"
                      : "border-border bg-white hover:border-primary/30 hover:shadow-[0_4px_20px_oklch(0.18_0.022_258/0.06)]"
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
                          ? "bg-white text-primary hover:bg-white/90"
                          : "bg-primary text-white hover:-translate-y-px hover:shadow-[0_6px_20px_oklch(0.50_0.195_265/0.28)]"
                      }`}
                    >
                      Contratar agora
                    </Link>
                  ) : (
                    <a
                      href={whatsappUrl("Olá! Tenho interesse no Pulse. Poderia me ajudar?")}
                      className={`inline-flex items-center justify-center h-11 rounded-lg font-semibold text-sm transition-all ${
                        isHighlight
                          ? "bg-white text-primary hover:bg-white/90"
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

      <section id="faq" className="py-24 bg-muted/30 border-y border-border">
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
                q: "O que acontece se minha empresa não cumprir a NR-1?",
                a: "A fiscalização pelo Ministério do Trabalho pode resultar em multas, interdição de atividades e processos trabalhistas. A partir de maio de 2026, o monitoramento de riscos psicossociais passa a ser exigência expressa — empresas sem documentação comprobatória ficam expostas.",
              },
              {
                q: "Quanto tempo leva para configurar e começar?",
                a: "Em média 20 a 30 minutos. Você cria a conta, importa sua equipe via planilha Excel, configura a frequência das pesquisas e está pronto. O sistema cuida do resto automaticamente.",
              },
              {
                q: "Os colaboradores precisam criar uma conta ou instalar algum app?",
                a: "Não. Eles recebem um link pelo WhatsApp ou SMS e respondem diretamente no navegador do celular. Sem cadastro, sem download, sem fricção.",
              },
              {
                q: "As respostas são realmente anônimas?",
                a: "Sim, por design técnico. Após o colaborador abrir o link da pesquisa, qualquer vínculo entre o token e a resposta é eliminado. Nem o RH, nem o gestor, nem nenhum administrador consegue saber quem respondeu o quê.",
              },
              {
                q: "E se o colaborador não quiser participar?",
                a: "Participação é sempre voluntária. O colaborador pode recusar o consentimento ou optar por sair a qualquer momento. A recusa é registrada formalmente, protegendo a empresa e respeitando os direitos do trabalhador.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Sem fidelidade, sem multa. Você pode cancelar a qualquer momento pelo próprio painel da plataforma. Seus dados ficam disponíveis para exportação por 30 dias após o cancelamento.",
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
        className="py-24 border-y border-border"
        style={{ background: "linear-gradient(135deg, oklch(0.50 0.195 265) 0%, oklch(0.42 0.18 285) 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <AnimateIn animation="fade-in">
            <Building2 className="w-10 h-10 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Sua empresa está em conformidade com a NR-1?
          </h2>
          <p className="text-lg opacity-80 mb-10 leading-relaxed">
            A fiscalização está mais rigorosa. Não espere uma auditoria para agir. Comece hoje com o Pulse e tenha a documentação sempre pronta.
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

      <footer className="py-12 bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Pulse — Solução para NR1. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/learn-more" className="hover:text-foreground transition-colors">Como funciona</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Acessar plataforma</Link>
            <a href="mailto:contato@pulse.com.br" className="hover:text-foreground transition-colors">Contato</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
