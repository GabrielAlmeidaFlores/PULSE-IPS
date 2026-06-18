"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Power, Trash2 } from "lucide-react";
import {
  updatePlanAction,
  updatePlanPriceAction,
  addPlanPriceAction,
  togglePlanActiveAction,
  deletePlanAction,
  deactivatePlanPriceAction,
} from "@/app/(super-admin)/super-admin/plans/actions";
import { setPlanFeaturesAction } from "@/app/(super-admin)/super-admin/plans/new/actions";
import {
  ALL_PLAN_FEATURES,
  PLAN_FEATURE_LABELS,
  type PlanFeature,
} from "@/modules/plans/plan.types";
import { ConfirmActionModal } from "@/components/confirm-action-modal";

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

const intervalLabel: Record<string, string> = {
  month: "Mensal",
  year: "Anual",
};

function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PriceRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground w-16 shrink-0">
        {label}
      </span>
      <div className="flex items-center flex-1 min-w-0 border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <span className="px-2 text-[12px] text-muted-foreground bg-muted border-r border-border select-none shrink-0">
          R$
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 w-full bg-input text-foreground text-[13px] px-2 py-1.5 focus:outline-none"
          style={{ borderRadius: 0 }}
        />
      </div>
    </div>
  );
}

interface PlanPrice {
  id: string;
  priceInCents: number;
  currency: string;
  interval: string;
  isActive: boolean;
}
interface Plan {
  id: string;
  name: string;
  description: string | null;
  maxEmployees: number | null;
  isActive: boolean;
  features: PlanFeature[];
  prices: PlanPrice[];
}

export function PlanRowActions({ plan }: { plan: Plan }): React.ReactElement {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleActiveOpen, setToggleActiveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [maxEmployees, setMaxEmployees] = useState<number | null>(
    plan.maxEmployees,
  );
  const [selectedFeatures, setSelectedFeatures] = useState<PlanFeature[]>(
    plan.features,
  );

  const [priceValues, setPriceValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      plan.prices.map((p) => [p.id, (p.priceInCents / 100).toFixed(2)]),
    ),
  );

  const hasMonth = plan.prices.some((p) => p.interval === "month");
  const hasYear = plan.prices.some((p) => p.interval === "year");
  const [newMonthly, setNewMonthly] = useState("");
  const [newYearly, setNewYearly] = useState("");

  function handleEditOpen(): void {
    setName(plan.name);
    setDescription(plan.description ?? "");
    setMaxEmployees(plan.maxEmployees);
    setSelectedFeatures(plan.features);
    setPriceValues(
      Object.fromEntries(
        plan.prices.map((p) => [p.id, (p.priceInCents / 100).toFixed(2)]),
      ),
    );
    setNewMonthly("");
    setNewYearly("");
    setEditOpen(true);
  }

  function toggleFeature(feature: PlanFeature): void {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature],
    );
  }

  async function syncExistingPrices(): Promise<string | null> {
    for (const price of plan.prices) {
      const rawValue = priceValues[price.id] ?? ""
      const newCents = rawValue === "" ? 0 : Math.round(parseFloat(rawValue) * 100)
      if (newCents === 0) {
        const r = await deactivatePlanPriceAction(price.id)
        if (r.error) return r.error
      } else if (newCents !== price.priceInCents) {
        const r = await updatePlanPriceAction(price.id, newCents)
        if (r.error) return r.error
      }
    }
    return null
  }

  async function addNewPrices(): Promise<string | null> {
    const monthCents = newMonthly ? Math.round(parseFloat(newMonthly) * 100) : 0
    const yearCents = newYearly ? Math.round(parseFloat(newYearly) * 100) : 0
    if (!hasMonth && monthCents > 0) {
      const r = await addPlanPriceAction(plan.id, monthCents, "month")
      if (r.error) return r.error
    }
    if (!hasYear && yearCents > 0) {
      const r = await addPlanPriceAction(plan.id, yearCents, "year")
      if (r.error) return r.error
    }
    return null
  }

  function handleSave(): void {
    startTransition(async () => {
      const planResult = await updatePlanAction({
        planId: plan.id,
        name,
        description,
        maxEmployees,
      });
      if (planResult.error) {
        toast.error(planResult.error);
        return;
      }

      const featuresResult = await setPlanFeaturesAction({
        planId: plan.id,
        features: selectedFeatures,
      });
      if (featuresResult.error) {
        toast.error(featuresResult.error);
        return;
      }

      const syncError = await syncExistingPrices()
      if (syncError !== null) {
        toast.error(syncError)
        return
      }

      const addError = await addNewPrices()
      if (addError !== null) {
        toast.error(addError)
        return
      }

      toast.success("Plano atualizado");
      setEditOpen(false);
      router.refresh();
    });
  }

  function handleToggleActive(): void {
    startTransition(async () => {
      const result = await togglePlanActiveAction(plan.id, !plan.isActive);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(plan.isActive ? "Plano desativado" : "Plano ativado");
      setToggleActiveOpen(false);
      router.refresh();
    });
  }

  function handleDelete(): void {
    startTransition(async () => {
      const result = await deletePlanAction(plan.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Plano excluído");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-0">
        <button
          onClick={handleEditOpen}
          disabled={isPending}
          title="Editar plano"
          className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setToggleActiveOpen(true)}
          disabled={isPending}
          title={plan.isActive ? "Desativar plano" : "Ativar plano"}
          className={`px-2.5 py-1.5 border border-border border-l-0 transition-colors disabled:opacity-50 ${plan.isActive ? "text-status-warning hover:text-status-warning hover:bg-status-warning-subtle" : "text-muted-foreground hover:text-status-success hover:bg-status-success-subtle"}`}
          style={{ borderRadius: 0 }}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
          title="Excluir plano"
          className="px-2.5 py-1.5 text-status-danger hover:bg-status-danger-subtle border border-status-danger-border border-l-0 transition-colors disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md mx-4 sm:mx-0 border border-border bg-card shadow-xl overflow-y-auto overflow-x-hidden max-h-[90vh]"
            style={{ borderRadius: 0 }}
          >
            <div className="border-b border-border px-5 py-3 border-l-4 border-l-primary flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest uppercase text-foreground">
                Editar Plano
              </span>
              <button
                onClick={() => setEditOpen(false)}
                className="text-muted-foreground hover:text-foreground text-[18px] leading-none"
                style={{ borderRadius: 0 }}
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <AdminField label="Nome do plano">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  style={{ borderRadius: 0 }}
                />
              </AdminField>
              <AdminField label="Descrição">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  style={{ borderRadius: 0 }}
                />
              </AdminField>
              <AdminField
                label="Limite de colaboradores"
                hint="Máximo: 300 colaboradores"
              >
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={maxEmployees ?? ""}
                  onChange={(e) =>
                    setMaxEmployees(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className={inputCls}
                  style={{ borderRadius: 0 }}
                />
              </AdminField>

              <div className="space-y-1">
                <span className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                  Funcionalidades
                </span>
                <div className="border border-border divide-y divide-border">
                  {ALL_PLAN_FEATURES.map((feature) => (
                    <label
                      key={feature}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeatures.includes(feature)}
                        onChange={() => {
                          toggleFeature(feature);
                        }}
                        className="accent-primary"
                      />
                      <span className="text-[13px] text-foreground">
                        {PLAN_FEATURE_LABELS[feature]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                  Valores (R$)
                </span>
                <div className="border border-border divide-y divide-border">
                  {plan.prices.map((price) => (
                    <PriceRow
                      key={price.id}
                      label={intervalLabel[price.interval] ?? price.interval}
                      value={priceValues[price.id] ?? ""}
                      onChange={(v) =>
                        setPriceValues((prev) => ({ ...prev, [price.id]: v }))
                      }
                    />
                  ))}
                  {!hasMonth && (
                    <PriceRow
                      label="Mensal"
                      value={newMonthly}
                      onChange={setNewMonthly}
                    />
                  )}
                  {!hasYear && (
                    <PriceRow
                      label="Anual"
                      value={newYearly}
                      onChange={setNewYearly}
                    />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground pl-0.5">
                  Deixe o campo vazio para remover um preço existente.
                </p>
              </div>

              <p className="text-[10px] text-muted-foreground border-l-2 border-status-warning-border pl-2 py-0.5">
                Alterações afetam apenas novos contratos. Assinaturas ativas não
                são modificadas.
              </p>
            </div>
            <div className="border-t border-border px-5 py-3 flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-[11px] font-bold tracking-widest uppercase border border-border text-muted-foreground hover:bg-muted transition-colors"
                style={{ borderRadius: 0 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !name.trim()}
                className="px-4 py-2 text-[11px] font-bold tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: 0 }}
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={isPending}
        title="Excluir plano"
        description={`Tem certeza que deseja excluir o plano "${plan.name}"? O plano será desativado e ocultado do sistema. Assinaturas existentes não são afetadas.`}
        confirmLabel="Excluir"
        variant="destructive"
      />

      <ConfirmActionModal
        open={toggleActiveOpen}
        onClose={() => setToggleActiveOpen(false)}
        onConfirm={handleToggleActive}
        loading={isPending}
        title={plan.isActive ? "Desativar plano" : "Ativar plano"}
        description={
          plan.isActive
            ? `Tem certeza que deseja desativar o plano "${plan.name}"? Ele ficará oculto para novos contratos.`
            : `Tem certeza que deseja ativar o plano "${plan.name}"? Ele voltará a aparecer para novos contratos.`
        }
        confirmLabel={plan.isActive ? "Desativar" : "Ativar"}
        variant={plan.isActive ? "destructive" : "warning"}
      />
    </>
  );
}
