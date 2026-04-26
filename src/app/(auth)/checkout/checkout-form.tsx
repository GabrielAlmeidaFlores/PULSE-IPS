"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { selfServiceCheckoutAction } from "@/app/(auth)/checkout/actions"
import { storage } from "@/libs/local-storage"

const schema = z.object({
  orgName: z.string().min(2, "Mínimo 2 caracteres"),
  slug: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens"),
  adminEmail: z.string().email("E-mail inválido"),
})

type FormValues = z.infer<typeof schema>

interface CheckoutFormProps {
  priceId: string
  planName: string
  priceLabel: string
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function CheckoutForm({ priceId, planName, priceLabel }: CheckoutFormProps): React.ReactElement {
  const router = useRouter()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  function handleOrgNameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    form.setValue("orgName", e.target.value)
    if (!form.getFieldState("slug").isDirty) {
      form.setValue("slug", toSlug(e.target.value))
    }
  }

  async function onSubmit(values: FormValues): Promise<void> {
    const result = await selfServiceCheckoutAction({ ...values, priceId })
    if (result.error) {
      toast.error(result.error)
      return
    }
    storage.set(storage.KEYS.lastOrgSlug, values.slug)
    router.push(result.checkoutUrl ?? "/")
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">CRIAR CONTA</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Preencha os dados da sua empresa para continuar ao pagamento
        </p>
      </div>

      <div className="border-b border-border px-6 py-3 bg-primary/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Plano selecionado</p>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-bold text-foreground">{planName}</span>
          <span className="text-[13px] font-black text-primary">{priceLabel}</span>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="space-y-1">
          <label htmlFor="orgName" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Nome da empresa
          </label>
          <input
            id="orgName"
            type="text"
            placeholder="Acme Industria Ltda"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            style={{ borderRadius: 0 }}
            {...form.register("orgName")}
            onChange={handleOrgNameChange}
          />
          {form.formState.errors.orgName && (
            <p className="text-[11px] text-destructive">{form.formState.errors.orgName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="slug" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Identificador da empresa
          </label>
          <div className="flex items-center border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors" style={{ borderRadius: 0 }}>
            <span className="px-3 h-[42px] text-[12px] text-muted-foreground bg-muted border-r border-border shrink-0 flex items-center font-mono">
              pulse.app/
            </span>
            <input
              id="slug"
              className="flex-1 px-3 h-[42px] text-[13px] bg-input text-foreground outline-none placeholder:text-muted-foreground"
              style={{ borderRadius: 0 }}
              placeholder="acme-industria"
              {...form.register("slug")}
            />
          </div>
          {form.formState.errors.slug && (
            <p className="text-[11px] text-destructive">{form.formState.errors.slug.message}</p>
          )}
          <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas, números e hifens. Usado no login.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="adminEmail" className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            E-mail do administrador
          </label>
          <input
            id="adminEmail"
            type="email"
            placeholder="rh@suaempresa.com"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            style={{ borderRadius: 0 }}
            {...form.register("adminEmail")}
          />
          {form.formState.errors.adminEmail && (
            <p className="text-[11px] text-destructive">{form.formState.errors.adminEmail.message}</p>
          )}
          <p className="text-[10px] text-muted-foreground">Você receberá um convite para criar sua senha após o pagamento.</p>
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase px-4 py-3 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          style={{ borderRadius: 0 }}
        >
          {form.formState.isSubmitting ? "Aguarde..." : "Continuar para pagamento →"}
        </button>
      </form>

      <div className="border-t border-border px-6 py-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Pagamento seguro. Cancele quando quiser.{" "}
          <Link href="/login" className="text-primary font-bold hover:underline uppercase tracking-wider">
            Já tenho conta
          </Link>
        </p>
      </div>
    </div>
  )
}
