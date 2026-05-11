"use client"

import { forwardRef } from "react"
import { ChevronDown } from "lucide-react"

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string
  containerClassName?: string
}

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    return (
      <div className={containerClassName !== undefined ? `relative ${containerClassName}` : "relative w-full"}>
        <select
          ref={ref}
          {...props}
          className={`w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 pr-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none ${className ?? ""}`}
          style={{ borderRadius: 0, ...props.style }}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
    )
  },
)

NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
