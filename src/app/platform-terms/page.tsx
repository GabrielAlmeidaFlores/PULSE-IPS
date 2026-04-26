import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { getActiveTermsVersion } from "@/modules/terms/terms.service"
import { sanitizeRichHtml } from "@/libs/utils/sanitize"

export const metadata: Metadata = {
  title: "Termos de Uso — Pulse",
  description: "Leia os Termos de Uso da plataforma Pulse.",
}

export default async function PlatformTermsPage(): Promise<React.ReactElement> {
  const terms = await getActiveTermsVersion().catch(() => null)

  return (
    <div className="min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
          <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Pulse</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">
              {terms?.title ?? "Termos de Uso"}
            </h1>
            {terms && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Versão {terms.version} · Vigência:{" "}
                {new Date(terms.effectiveAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {terms ? (
          <div
            className="prose prose-sm max-w-none text-foreground leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_p]:text-[15px] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_li]:mb-1.5 [&_li]:text-[15px] [&_strong]:font-semibold [&_hr]:border-border [&_hr]:my-6"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(terms.content) }}
          />
        ) : (
          <div className="border border-border bg-muted/30 p-8 text-center" style={{ borderRadius: 0 }}>
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Termos de uso em elaboração</p>
            <p className="text-sm text-muted-foreground">
              Em breve disponibilizaremos nossos termos de uso completos.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pulse. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
