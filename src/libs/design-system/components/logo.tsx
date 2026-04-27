interface LogoProps {
  size?: "sm" | "md" | "lg"
  align?: "start" | "center"
}

export function Logo({ size = "md", align = "start" }: LogoProps): React.ReactElement {
  const titleSizeMap = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" }
  const subtitleSizeMap = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" }
  const titleSize = titleSizeMap[size]
  const subtitleSize = subtitleSizeMap[size]
  const gap = size === "lg" ? "gap-1" : "gap-0.5"
  const alignment = align === "center" ? "items-center" : "items-start"

  return (
    <div className={`flex flex-col leading-none ${gap} ${alignment}`}>
      <span className={`font-extrabold tracking-tight gradient-text ${titleSize}`}>
        Pulse
      </span>
      <span className={`font-medium tracking-widest uppercase text-muted-foreground/60 ${subtitleSize}`}>
        Saúde Ocupacional
      </span>
    </div>
  )
}
