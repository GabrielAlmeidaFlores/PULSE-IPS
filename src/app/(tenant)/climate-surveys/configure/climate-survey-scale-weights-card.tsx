import { CLIMATE_SURVEY_LIKERT_SCALE } from "@/modules/climate-surveys/climate-survey-metrics"

export function ClimateSurveyScaleWeightsCard(): React.ReactElement {
  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-4 py-2.5 bg-muted">
        <p className="text-[10px] font-black tracking-widest uppercase text-foreground">Escala e pesos (RN-01)</p>
      </div>
      <div className="p-4">
        <p className="text-[11px] text-muted-foreground mb-3">
          Escala Likert de 5 pontos. Os pesos alimentam o índice de clima e o eNPS; a favorabilidade considera as
          respostas de concordância (scores ≥ 4).
        </p>
        <ul className="space-y-1.5">
          {CLIMATE_SURVEY_LIKERT_SCALE.map((point) => (
            <li key={point.score} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-4 text-center font-bold tabular-nums text-muted-foreground">{point.score}</span>
                <span className="text-foreground">{point.label}</span>
              </span>
              <span className="tabular-nums font-bold text-foreground">{point.weight.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
