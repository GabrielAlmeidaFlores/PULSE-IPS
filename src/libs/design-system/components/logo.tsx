import Image from "next/image"
import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg"
  align?: "start" | "center"
  variant?: "auto" | "dark" | "light"
  className?: string
}

const HEIGHT_MAP = { xs: 14, sm: 20, md: 28, lg: 36 }
const WIDTH_MAP = { xs: 100, sm: 142, md: 198, lg: 255 }

export function Logo({ size = "md", align = "start", variant = "auto", className }: LogoProps): React.ReactElement {
  const h = HEIGHT_MAP[size]
  const w = WIDTH_MAP[size]
  const alignment = align === "center" ? "mx-auto" : ""
  const imgStyle = { width: w, height: h }

  if (variant === "dark") {
    return (
      <span className={cn("inline-flex shrink-0", className)}>
        <Image
          src="/logo-horizontal-dark.svg"
          alt="Pulse IPS"
          width={w}
          height={h}
          style={imgStyle}
          className={cn("h-auto", alignment)}
          priority
        />
      </span>
    )
  }

  if (variant === "light") {
    return (
      <span className={cn("inline-flex shrink-0", className)}>
        <Image
          src="/logo-horizontal-light.svg"
          alt="Pulse IPS"
          width={w}
          height={h}
          style={imgStyle}
          className={cn("h-auto", alignment)}
          priority
        />
      </span>
    )
  }

  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <Image
        src="/logo-horizontal-light.svg"
        alt="Pulse IPS"
        width={w}
        height={h}
        style={imgStyle}
        className={cn("h-auto block dark:hidden", alignment)}
        priority
      />
      <Image
        src="/logo-horizontal-dark.svg"
        alt="Pulse IPS"
        width={w}
        height={h}
        style={imgStyle}
        className={cn("h-auto hidden dark:block", alignment)}
        priority
      />
    </span>
  )
}
