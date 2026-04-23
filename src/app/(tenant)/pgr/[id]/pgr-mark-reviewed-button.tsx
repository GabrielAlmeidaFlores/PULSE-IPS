"use client"
import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { markPgrAsReviewedAction } from "@/app/(tenant)/pgr/actions"
import { toast } from "sonner"

interface PgrMarkReviewedButtonProps {
  reviewId: string
}

export function PgrMarkReviewedButton({ reviewId }: PgrMarkReviewedButtonProps): React.ReactElement {
  const [loading, setLoading] = useState(false)

  async function handleClick(): Promise<void> {
    setLoading(true)
    const result = await markPgrAsReviewedAction(reviewId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("PGR marcado como revisado.")
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
      Marcar como revisado
    </button>
  )
}
