"use client"

import { useRef } from "react"

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
}

export function OtpInput({ value, onChange, length = 6, disabled = false }: OtpInputProps): React.ReactElement {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, char: string): void {
    const digit = char.replace(/\D/g, "").slice(-1)
    const chars = value.split("")
    chars[index] = digit
    const next = chars.join("").slice(0, length)
    onChange(next.padEnd(length, "").trimEnd())
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Backspace") {
      if (value[index] !== undefined && value[index] !== "") {
        const chars = value.split("")
        chars[index] = ""
        onChange(chars.join(""))
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus()
        const chars = value.split("")
        chars[index - 1] = ""
        onChange(chars.join(""))
      }
      e.preventDefault()
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    onChange(pasted)
    const nextIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[nextIndex]?.focus()
  }

  function handleFocus(index: number, e: React.FocusEvent<HTMLInputElement>): void {
    const firstEmptyIndex = Array.from({ length }, (_, i) => value[i] ?? "").findIndex(
      (c) => c === "",
    )
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex
    if (index > targetIndex) {
      inputsRef.current[targetIndex]?.focus()
      return
    }
    e.target.select()
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => { handleChange(i, e.target.value) }}
          onKeyDown={(e) => { handleKeyDown(i, e) }}
          onPaste={handlePaste}
          onFocus={(e) => { handleFocus(i, e) }}
          style={{ borderRadius: 0 }}
          className="w-10 h-11 text-center text-base font-mono font-semibold border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
      ))}
    </div>
  )
}
