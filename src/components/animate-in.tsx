"use client"

import { useEffect, useRef, useState } from "react"

type AnimationType = "fade-in-up" | "fade-in" | "scale-in"

interface AnimateInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  animation?: AnimationType
  threshold?: number
}

const ANIMATION_STYLES: Record<AnimationType, string> = {
  "fade-in-up": "lp-fade-in-up 0.65s ease-out both",
  "fade-in":    "lp-fade-in 0.5s ease-out both",
  "scale-in":   "lp-scale-in 0.55s ease-out both",
}

export function AnimateIn({
  children,
  className,
  delay = 0,
  animation = "fade-in-up",
  threshold = 0.12,
}: AnimateInProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect((): (() => void) => {
    const el = ref.current
    if (!el) return (): void => undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting === true) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(el)
    return (): void => { observer.disconnect() }
  }, [threshold])

  return (
    <div
      ref={ref}
      className={className}
      style={
        visible
          ? { animation: ANIMATION_STYLES[animation], animationDelay: `${delay}ms` }
          : { opacity: 0 }
      }
    >
      {children}
    </div>
  )
}
