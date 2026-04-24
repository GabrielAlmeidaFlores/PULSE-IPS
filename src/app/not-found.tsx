import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"

function PulseWaveform(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 320 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xs opacity-25"
      aria-hidden="true"
    >
      <polyline
        points="0,30 40,30 55,10 65,50 75,20 90,40 100,30 160,30 175,5 185,55 195,15 210,45 220,30 320,30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  )
}

export default function NotFound(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">
            PULSE
          </span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">
            PLATAFORMA NR-1
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="flex flex-col items-center gap-6 mb-10">
            <span className="text-[110px] font-black leading-none gradient-text select-none tabular-nums">
              404
            </span>
            <PulseWaveform />
          </div>

          <div className="border border-border bg-card p-6 mb-8 border-l-4 border-l-primary">
            <h1 className="text-[11px] font-bold tracking-widest uppercase text-primary mb-2">
              Página não encontrada
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O endereço que você acessou não existe ou foi movido. Verifique
              a URL ou use os atalhos abaixo para continuar navegando.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase px-5 py-3 hover:opacity-90 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              <Home className="h-3.5 w-3.5 shrink-0" />
              Ir para o painel
            </Link>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-border bg-card text-foreground text-[11px] font-bold tracking-widest uppercase px-5 py-3 hover:bg-muted transition-colors"
              style={{ borderRadius: 0 }}
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              Página inicial
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-3">
        <p className="text-[10px] text-muted-foreground/60 text-center tracking-[0.2em] uppercase">
          Pulse — Conformidade NR-1
        </p>
      </footer>
    </div>
  )
}
