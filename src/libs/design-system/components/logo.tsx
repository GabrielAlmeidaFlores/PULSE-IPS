import React from "react"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  align?: "start" | "center"
}

export function Logo({ size = "md", align = "start" }: LogoProps): React.ReactElement {
  const sizeMap = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" }
  const alignment = align === "center" ? "justify-center" : "justify-start"

  return (
    <div className={`flex items-baseline leading-none gap-1.5 ${alignment}`}>
      <span className={`font-black tracking-tight text-primary ${sizeMap[size]}`}>
        PULSE
      </span>
      <span className={`font-light tracking-[0.18em] text-foreground/50 ${sizeMap[size]}`}>
        IPS
      </span>
    </div>
  )
}
