"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ALL_PLAN_FEATURES, PLAN_FEATURE_LABELS, type PlanFeature } from "@/modules/plans/plan.types"
import { setPlanFeaturesAction } from "@/app/(super-admin)/super-admin/plans/new/actions"

interface PlanFeaturesFormProps {
  planId: string
  currentFeatures: PlanFeature[]
}

export function PlanFeaturesForm({ planId, currentFeatures }: PlanFeaturesFormProps): React.ReactElement {
  const router = useRouter()
  const [selectedFeatures, setSelectedFeatures] = useState<PlanFeature[]>(currentFeatures)
  const [saving, setSaving] = useState(false)

  function toggleFeature(feature: PlanFeature): void {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature],
    )
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      const result = await setPlanFeaturesAction({ planId, features: selectedFeatures })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Funcionalidades atualizadas com sucesso")
      router.push("/super-admin/plans")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-5 py-3 border-l-4 border-l-primary">
        <span className="text-[11px] font-black tracking-widest uppercase text-foreground">Funcionalidades Incluídas</span>
      </div>

      <div className="divide-y divide-border">
        {ALL_PLAN_FEATURES.map((feature) => (
          <label
            key={feature}
            className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedFeatures.includes(feature)}
              onChange={() => { toggleFeature(feature) }}
              className="accent-primary"
            />
            <div>
              <span className="text-[13px] font-medium text-foreground">{PLAN_FEATURE_LABELS[feature]}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-border">
        <button
          onClick={() => { void handleSave() }}
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ borderRadius: 0 }}
        >
          {saving ? "Salvando..." : "Salvar Funcionalidades"}
        </button>
      </div>
    </div>
  )
}
