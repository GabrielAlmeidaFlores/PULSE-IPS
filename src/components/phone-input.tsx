"use client"

import { IMaskInput } from "react-imask"
import type { FactoryArg, Masked, MaskedDynamic } from "imask"
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  name?: string
  id?: string
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
  "aria-invalid"?: boolean
}

const MASKS: FactoryArg[] = [
  { mask: "+00 (00) 00000-0000" },
  { mask: "+000000000000000" },
]

function dispatchMask(
  appended: string,
  dynamicMasked: MaskedDynamic,
): Masked {
  const rawDigits = (dynamicMasked.value + appended).replace(/\D/g, "")
  const brMask = dynamicMasked.compiledMasks[0]
  const intlMask = dynamicMasked.compiledMasks[1]
  const fallback = brMask ?? intlMask
  if (rawDigits.startsWith("55") || rawDigits === "5") {
    return brMask ?? intlMask ?? (fallback as Masked)
  }
  return intlMask ?? brMask ?? (fallback as Masked)
}

const INPUT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [color-scheme:light] dark:[color-scheme:dark]"

export function PhoneInput({
  value = "",
  onChange,
  onBlur,
  name,
  id,
  disabled,
  style,
  className,
  "aria-invalid": ariaInvalid,
}: PhoneInputProps): React.ReactElement {
  return (
    <IMaskInput
      mask={MASKS}
      dispatch={dispatchMask}
      value={value}
      onAccept={(val: unknown) => onChange?.(String(val))}
      onBlur={onBlur}
      name={name}
      id={id}
      disabled={disabled}
      style={style}
      placeholder="+55 (11) 99999-9999"
      data-slot="input"
      aria-invalid={ariaInvalid}
      className={cn(INPUT_CLASS, className)}
    />
  )
}
