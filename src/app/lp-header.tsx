"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Logo } from "@/libs/design-system/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function LpHeader(): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  function openMenu(): void {
    setIsClosing(false)
    setMenuOpen(true)
  }

  function closeMenu(): void {
    setIsClosing(true)
  }

  function handleAnimationEnd(): void {
    if (isClosing) {
      setMenuOpen(false)
      setIsClosing(false)
    }
  }

  useEffect(() => {
    if (!menuOpen) return

    function handleOutsideClick(e: MouseEvent): void {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [menuOpen])

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo size="sm" className="w-[96px] md:w-[142px]" />

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          <a href="#faq" className="hover:text-foreground transition-colors">Dúvidas</a>
          <Link href="/learn-more" className="hover:text-foreground transition-colors">Saiba mais</Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2">
            Entrar
          </Link>
          <a
            href="#planos"
            className="hidden md:inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_oklch(0.705_0.128_164/0.28)]"
          >
            Começar agora
          </a>
          <button
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 border-t border-border bg-background shadow-lg px-6 py-4 space-y-3"
          style={{ animation: `${isClosing ? "lp-menu-slide-up 0.15s ease-in" : "lp-menu-slide-down 0.18s ease-out"} both` }}
          onAnimationEnd={handleAnimationEnd}
        >
          {[
            { href: "#recursos", label: "Recursos" },
            { href: "#como-funciona", label: "Como funciona" },
            { href: "#planos", label: "Planos" },
            { href: "#faq", label: "Dúvidas" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => closeMenu()}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/learn-more"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            onClick={() => closeMenu()}
          >
            Saiba mais
          </Link>
          <div className="pt-1">
            <Link
              href="/login"
              className="flex items-center justify-center h-10 px-4 rounded-lg border border-border text-foreground text-sm font-semibold w-full transition-all hover:border-primary/60 hover:text-primary"
              onClick={() => closeMenu()}
            >
              Entrar
            </Link>
          </div>
          <div className="pt-1">
            <a
              href="#planos"
              className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold w-full transition-all hover:bg-primary/90"
              onClick={() => closeMenu()}
            >
              Começar agora
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
