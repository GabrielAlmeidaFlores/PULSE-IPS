"use client"

import { useState, useTransition } from "react"
import type { ActionResult } from "@/libs/utils/action-result"
import { addPlanPriceAction, updatePlanPriceAction } from "@/app/(super-admin)/super-admin/plans/actions"
import { NativeSelect } from "@/components/ui/native-select"
import type { BillingInterval } from "@/modules/plans/plan.types"

interface PlanPrice {
  id: string
  priceInCents: number
  currency: string
  interval: string
  isActive: boolean
  externalPriceId: string | null
}

interface Props {
  planId: string
  prices: PlanPrice[]
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function AddPriceForm({ planId }: { planId: string }): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>()
  const [amount, setAmount] = useState("")
  const [interval, setInterval] = useState<BillingInterval>("month")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100)
    if (isNaN(cents) || cents <= 0) {
      setError("Valor inválido.")
      return
    }
    startTransition(async () => {
      const result: ActionResult = await addPlanPriceAction(planId, cents, interval)
      if (result.error) {
        setError(result.error)
      } else {
        setError(undefined)
        setAmount("")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 mt-4">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor (R$)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="99,90"
          className="border border-border bg-background px-3 py-1.5 text-[12px] w-28 focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ borderRadius: 0 }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Intervalo</label>
        <NativeSelect
          value={interval}
          onChange={(e) => setInterval(e.target.value as BillingInterval)}
        >
          <option value="month">Mensal</option>
          <option value="year">Anual</option>
        </NativeSelect>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
        style={{ borderRadius: 0 }}
      >
        {pending ? "Adicionando..." : "Adicionar Preço"}
      </button>
      {error !== undefined && <span className="text-[11px] text-destructive">{error}</span>}
    </form>
  )
}

function EditPriceRow({ price }: { price: PlanPrice }): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(price.priceInCents / 100).replace(".", ","))
  const [error, setError] = useState<string | undefined>()

  function handleSave(): void {
    const cents = Math.round(parseFloat(value.replace(",", ".")) * 100)
    if (isNaN(cents) || cents <= 0) {
      setError("Valor inválido.")
      return
    }
    startTransition(async () => {
      const result: ActionResult = await updatePlanPriceAction(price.id, cents)
      if (result.error) {
        setError(result.error)
      } else {
        setError(undefined)
        setEditing(false)
      }
    })
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
      <td className="px-4 py-2.5 font-mono">
        {editing ? (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border border-border bg-background px-2 py-0.5 text-[12px] w-24 focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ borderRadius: 0 }}
          />
        ) : (
          <span className="admin-accent-green">{formatBRL(price.priceInCents)}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground capitalize">{price.interval === "month" ? "Mensal" : "Anual"}</td>
      <td className="px-4 py-2.5">
        <span
          className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${price.isActive ? "admin-bg-green admin-accent-green" : "bg-muted text-muted-foreground"}`}
          style={{ borderRadius: 0 }}
        >
          {price.isActive ? "ativo" : "inativo"}
        </span>
      </td>
      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{price.externalPriceId ?? "—"}</td>
      <td className="px-4 py-2.5 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            {error !== undefined && <span className="text-[11px] text-destructive mr-2">{error}</span>}
            <button
              onClick={handleSave}
              disabled={pending}
              className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {pending ? "..." : "Salvar"}
            </button>
            <button
              onClick={() => { setEditing(false); setError(undefined) }}
              className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              style={{ borderRadius: 0 }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ borderRadius: 0 }}
          >
            Editar
          </button>
        )}
      </td>
    </tr>
  )
}

export function PlanPricingManager({ planId, prices }: Props): React.ReactElement {
  return (
    <div>
      <div className="border border-border bg-card">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Valor</th>
              <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Intervalo</th>
              <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">ID Externo</th>
              <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {prices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-[11px] tracking-wide">
                  Nenhum preço configurado ainda.
                </td>
              </tr>
            )}
            {prices.map((price) => (
              <EditPriceRow key={price.id} price={price} />
            ))}
          </tbody>
        </table>
      </div>
      <AddPriceForm planId={planId} />
    </div>
  )
}
