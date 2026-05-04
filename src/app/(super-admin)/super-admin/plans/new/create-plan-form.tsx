"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { createPlanAction } from "@/app/(super-admin)/super-admin/plans/new/actions";
import {
  ALL_PLAN_FEATURES,
  PLAN_FEATURE_LABELS,
  type PlanFeature,
} from "@/modules/plans/plan.types";

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string(),
  maxEmployees: z.number().int().positive(),
  features: z.array(z.string()),
  monthlyPrice: z.string().optional(),
  yearlyPrice: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function AdminField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

function PriceInput({
  placeholder,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  placeholder?: string;
}): React.ReactElement {
  return (
    <div className="flex items-center border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
      <span className="px-3 py-2.5 text-[12px] text-muted-foreground bg-muted border-r border-border select-none">
        R$
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder ?? "0.00"}
        className="flex-1 bg-input text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none"
        style={{ borderRadius: 0 }}
        {...props}
      />
    </div>
  );
}

export function CreatePlanForm(): React.ReactElement {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      monthlyPrice: "",
      yearlyPrice: "",
      features: [],
    },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    const monthlyPriceInCents = values.monthlyPrice
      ? Math.round(parseFloat(values.monthlyPrice) * 100)
      : undefined;
    const yearlyPriceInCents = values.yearlyPrice
      ? Math.round(parseFloat(values.yearlyPrice) * 100)
      : undefined;

    const result = await createPlanAction({
      name: values.name,
      description: values.description,
      maxEmployees: values.maxEmployees,
      features: values.features,
      ...(monthlyPriceInCents && monthlyPriceInCents > 0
        ? { monthlyPriceInCents }
        : {}),
      ...(yearlyPriceInCents && yearlyPriceInCents > 0
        ? { yearlyPriceInCents }
        : {}),
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Plano criado com sucesso");
    router.push("/super-admin/plans");
  }

  const selectedFeatures = useWatch({
    control: form.control,
    name: "features",
  }) as PlanFeature[];

  function toggleFeature(feature: PlanFeature): void {
    const current = form.getValues("features") as PlanFeature[];
    if (current.includes(feature)) {
      form.setValue(
        "features",
        current.filter((f) => f !== feature),
      );
    } else {
      form.setValue("features", [...current, feature]);
    }
  }

  return (
    <div
      className="max-w-lg border border-border bg-card"
      style={{ borderRadius: 0 }}
    >
      <div className="border-b border-border px-5 py-3 border-l-4 border-l-primary">
        <span className="text-[11px] font-black tracking-widest uppercase text-foreground">
          Dados do Plano
        </span>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
        <AdminField
          label="Nome do plano"
          error={form.formState.errors.name?.message}
        >
          <input
            type="text"
            placeholder="Básico"
            className={inputCls}
            style={{ borderRadius: 0 }}
            {...form.register("name")}
          />
        </AdminField>

        <AdminField
          label="Descrição"
          error={form.formState.errors.description?.message}
        >
          <textarea
            placeholder="Descrição opcional do plano"
            rows={3}
            className={`${inputCls} resize-none`}
            style={{ borderRadius: 0 }}
            {...form.register("description")}
          />
        </AdminField>

        <AdminField
          label="Limite de colaboradores"
          hint="Máximo: 300 colaboradores"
          error={form.formState.errors.maxEmployees?.message}
        >
          <input
            type="number"
            min={1}
            max={300}
            placeholder="50"
            className={inputCls}
            style={{ borderRadius: 0 }}
            {...form.register("maxEmployees", { valueAsNumber: true })}
          />
        </AdminField>

        <div className="border border-border divide-y divide-border">
          <div className="px-3 py-2 bg-muted">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              Funcionalidades incluídas
            </span>
          </div>
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

        <div className="border border-border divide-y divide-border">
          <div className="px-3 py-2 bg-muted">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              Valores (R$)
            </span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground w-16 shrink-0">
              Mensal
            </span>
            <PriceInput
              {...form.register("monthlyPrice")}
              placeholder="99,90"
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground w-16 shrink-0">
              Anual
            </span>
            <PriceInput
              {...form.register("yearlyPrice")}
              placeholder="990.00"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 0 }}
          >
            {form.formState.isSubmitting ? "Criando..." : "Criar Plano"}
          </button>
        </div>
      </form>
    </div>
  );
}
