import Image from "next/image"
import React from "react"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  align?: "start" | "center"
  variant?: "auto" | "dark" | "light"
}

const HEIGHT_MAP = { sm: 20, md: 28, lg: 36 }
const WIDTH_MAP = { sm: 142, md: 198, lg: 255 }

export function Logo({ size = "md", align = "start", variant = "auto" }: LogoProps): React.ReactElement {
  const h = HEIGHT_MAP[size]
  const w = WIDTH_MAP[size]
  const alignment = align === "center" ? "mx-auto" : ""

  if (variant === "dark") {
    return (
      <Image
        src="/logo-horizontal-dark.svg"
        alt="Pulse IPS"
        width={w}
        height={h}
        className={alignment}
        priority
      />
    )
  }

  if (variant === "light") {
    return (
      <Image
        src="/logo-horizontal-light.svg"
        alt="Pulse IPS"
        width={w}
        height={h}
        className={alignment}
        priority
      />
    )
  }

  return (
    <>
      <Image
        src="/logo-horizontal-light.svg"
        alt="Pulse IPS"
        width={w}
        height={h}
        className={`block dark:hidden ${alignment}`}
        priority
      />
      <Image
        src="/logo-horizontal-dark.svg"
        alt="Pulse IPS"
        width={w}
        height={h}
        className={`hidden dark:block ${alignment}`}
        priority
      />
    </>
  )
}
