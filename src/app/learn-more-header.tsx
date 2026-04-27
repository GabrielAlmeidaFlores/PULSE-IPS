"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Logo } from "@/libs/design-system/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function LearnMoreHeader(): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#desafio" className="hover:text-foreground transition-colors">O desafio</a>
          <a href="#solucao" className="hover:text-foreground transition-colors">A solução</a>
          <a href="#fluxo" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#seguranca" className="hover:text-foreground transition-colors">Segurança</a>
          <a href="#faq" className="hover:text-foreground transition-colors">Dúvidas</a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2">
            Entrar
          </Link>
          <Link
            href="/#planos"
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_oklch(0.705_0.128_164/0.28)]"
          >
            Ver planos
          </Link>
          <button
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4 space-y-3">
          {[
            { href: "#desafio", label: "O desafio" },
            { href: "#solucao", label: "A solução" },
            { href: "#fluxo", label: "Como funciona" },
            { href: "#seguranca", label: "Segurança" },
            { href: "#faq", label: "Dúvidas" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <Link href="/login" className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
            Entrar
          </Link>
        </div>
      )}
    </header>
  )
}
